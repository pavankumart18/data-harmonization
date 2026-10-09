# /// script
# requires-python = ">=3.11"
# dependencies = ["duckdb>=1.1"]
# ///
"""Installed-base & receivables harmonization pipeline (Scenario 4).

Reads the ten raw operational extracts (zip or folder), never modifies them, and writes a
versioned run folder of JSON contracts consumed by the static front end (bd.js):

    uv run pipeline/bd_pipeline.py generate --input 282_BD_MMS_Rebuilt_Raw_Source_Data.zip --output public/bd

Outputs land in <output>/<run_id>/, <output>/latest.json points at the newest run, and
bd_data.js (repo root) bundles the same run so the demo also works from file://.
Results are deterministic for a given input; only generated_at changes between runs.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import re
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

import duckdb

SCHEMA_VERSION = "1.0.0"
RULESET_VERSION = "dq-rules-1.0"
MATCHER_VERSION = "match-1.0"
DEFAULT_AS_OF = "2026-10-08"
HERE = Path(__file__).resolve().parent
SQL_DIR = HERE / "sql"
REPO = HERE.parent

AUTO_THRESHOLD = 0.95      # at or above: published without review (unless a same-source duplicate)
REVIEW_THRESHOLD = 0.75    # between review and auto: human review; below: no match
RAG_THRESHOLDS = {
    "red_fail_rate": 0.25,          # share of eligible rows failing a medium/high rule
    "red_high_severity_rate": 0.10, # share of eligible rows failing a high rule
    "link_green": 1.0,
    "link_amber": 0.75,
    "note": "Demo-configurable. Red = materially inconsistent/invalid, amber = incomplete or needs review, green = no material failures among applicable checks.",
}

SOURCES = [
    dict(code="01", file="01_reltio_customer_profiles.csv", table="reltio", label="Reltio customer profiles",
         system="Reltio MDM", key="Reltio_Record_ID", grain="One master profile per enterprise parent or facility",
         date_field="MDM_Last_Verified", owner="Reltio MDM data steward"),
    dict(code="02", file="02_sap_customer_accounts.csv", table="sap_accounts", label="SAP customer accounts",
         system="SAP Everest / JDE Legacy", key="ERP_System + ERP_Customer_ID", grain="One ERP account per customer role",
         date_field="Last_Updated_Date", owner="ERP customer master team"),
    dict(code="03", file="03_salesforce_contacts.csv", table="sf_contacts", label="Salesforce contacts",
         system="Salesforce", key="Universal_Contact_ID", grain="One person in a contact role",
         date_field="Last_Activity_Date", owner="Salesforce CRM admin"),
    dict(code="04", file="04_salesforce_accounts.csv", table="sf_accounts", label="Salesforce accounts",
         system="Salesforce", key="Salesforce_Account_ID", grain="One CRM account (facility)",
         date_field="Last_Modified_Date", owner="Salesforce CRM admin"),
    dict(code="05", file="05_salesforce_contracts.csv", table="sf_contracts", label="Salesforce contracts",
         system="Salesforce", key="Contract_ID", grain="One transactional contract under a master agreement",
         date_field=None, owner="Contracts & pricing team"),
    dict(code="06", file="06_installed_equipment.csv", table="equipment", label="Installed equipment",
         system="Install base", key="Electronic_Asset_ID", grain="One installed device",
         date_field="Equipment_Confirmation_Date", owner="Install base / service operations"),
    dict(code="07", file="07_equipment_movements.csv", table="movements", label="Equipment movements",
         system="Install base events", key="Transfer_Event_No", grain="One install or move event",
         date_field="Movement_Date", owner="Field service operations"),
    dict(code="08", file="08_field_service_work_orders.csv", table="service", label="Field service work orders",
         system="Field service", key="Service_Work_Order", grain="One service visit",
         date_field="Visit_Date", owner="Field service operations"),
    dict(code="09", file="09_sap_sales_orders.csv", table="orders", label="SAP sales orders",
         system="SAP SD", key="SAP_Sales_Order", grain="One sales order line",
         date_field="Order_Created_On", owner="Order management (SAP SD)"),
    dict(code="10", file="10_sap_billing_and_receivables.csv", table="billing", label="SAP billing & receivables",
         system="SAP FI-AR", key="SAP_Billing_Document", grain="One invoice",
         date_field="Billing_Date", owner="Accounts receivable / collections"),
]
SRC = {s["code"]: s for s in SOURCES}
EXPECTED_COUNTS = {"01": 9, "02": 24, "03": 27, "04": 7, "05": 12, "06": 60, "07": 68, "08": 41, "09": 120, "10": 120}

SQL_STAGES = [  # (file, table, stage) - stage A runs before matching, stage B after the crosswalk exists
    ("01_invoice_order_join.sql", "q_invoice_order_join", "A"),
    ("02_identifier_index.sql", "identifier_index", "A"),
    ("03_asset_resolution.sql", "q_asset_resolution", "A"),
    ("04_order_account_roles.sql", "q_order_account_roles", "A"),
    ("05_invoice_payer_consistency.sql", "q_invoice_payer_consistency", "A"),
    ("06_contract_account.sql", "q_contract_account", "A"),
    ("07_asset_event_timeline.sql", "q_asset_event_timeline", "A"),
    ("08_contact_account.sql", "q_contact_account", "A"),
    ("09_order_entitlement.sql", "q_order_entitlement", "B"),
    ("10_open_ar_aging.sql", "q_open_ar_aging", "B"),
]
SQL_INPUTS = {
    "01_invoice_order_join.sql": ["billing", "orders"],
    "02_identifier_index.sql": ["equipment", "movements", "service", "orders"],
    "03_asset_resolution.sql": ["identifier_index", "equipment"],
    "04_order_account_roles.sql": ["orders", "sap_accounts"],
    "05_invoice_payer_consistency.sql": ["q_invoice_order_join", "sap_accounts"],
    "06_contract_account.sql": ["sf_contracts", "sf_accounts"],
    "07_asset_event_timeline.sql": ["equipment", "movements", "service", "q_asset_resolution"],
    "08_contact_account.sql": ["sf_contacts", "sf_accounts"],
    "09_order_entitlement.sql": ["orders", "sf_contracts", "xwalk"],
    "10_open_ar_aging.sql": ["billing"],
}

SQL_EXCEPTIONS = {  # DQ rules whose findings are the exceptions surfaced by each statement
    "01_invoice_order_join.sql": ["C-10-PAYER", "V-AR-STATUS"],
    "02_identifier_index.sql": ["V-SERIAL"],
    "03_asset_resolution.sql": ["V-SERIAL", "R-09-ASSET", "C-08-IDS"],
    "04_order_account_roles.sql": ["S-ORDER-SYS", "S-ORDER-ROLE", "C-09-PAYER"],
    "05_invoice_payer_consistency.sql": ["C-10-PAYER", "B-PAYER-01"],
    "06_contract_account.sql": ["C-05-ACCT"],
    "07_asset_event_timeline.sql": ["F-ASSET-LOC", "B-ORDER-LOC"],
    "08_contact_account.sql": ["C-03-ACCT", "R-03-ACCT"],
    "09_order_entitlement.sql": ["B-ENTITLE-01", "B-PO-01"],
    "10_open_ar_aging.sql": ["V-AR-STATUS"],
}
SERIAL_RE = re.compile(r"^(ADC|INF)-\d{4}-\d{6}$")
UDI_RE = re.compile(r"^UDI-\d{4}-\d{8}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SITE_DESCRIPTORS = {"hospital", "hosp", "main", "campus"}


# ─────────────────────────────────────────────────────────────────────────────
#  Input
# ─────────────────────────────────────────────────────────────────────────────
def read_inputs(path: Path) -> dict[str, bytes]:
    wanted = {s["file"] for s in SOURCES}
    found: dict[str, bytes] = {}
    if path.is_file() and path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as zf:
            for name in zf.namelist():
                base = name.rsplit("/", 1)[-1]
                if base in wanted:
                    found[base] = zf.read(name)
    elif path.is_dir():
        for f in wanted:
            p = path / f
            if p.exists():
                found[f] = p.read_bytes()
    missing = wanted - set(found)
    if missing:
        raise SystemExit(f"input is missing required source files: {sorted(missing)}")
    return found


def parse_sources(blobs: dict[str, bytes]) -> dict[str, dict]:
    out = {}
    for s in SOURCES:
        text = blobs[s["file"]].decode("utf-8-sig")
        reader = csv.reader(io.StringIO(text))
        header = next(reader)
        rows = []
        for i, values in enumerate(reader, start=1):
            if not any(v.strip() for v in values):
                continue
            row = {"_rid": f"{s['code']}:{i:03d}"}
            for col, v in zip(header, values):
                row[col] = v.strip()
            rows.append(row)
        out[s["code"]] = {"columns": header, "rows": rows}
    return out


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


# ─────────────────────────────────────────────────────────────────────────────
#  Small helpers
# ─────────────────────────────────────────────────────────────────────────────
def blank(v) -> bool:
    return v is None or str(v).strip() == ""


def d(v):
    try:
        return dt.date.fromisoformat(v) if v and DATE_RE.match(v) else None
    except ValueError:
        return None


def fnum(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def norm_serial(v: str) -> str:
    v = v.strip().upper()
    if "-" not in v:
        return v
    head, rest = v.split("-", 1)
    return head + "-" + rest.replace("O", "0")


def jaro(s: str, t: str) -> float:
    if s == t:
        return 1.0
    ls, lt = len(s), len(t)
    if not ls or not lt:
        return 0.0
    md = max(max(ls, lt) // 2 - 1, 0)
    sm, tm, m = [False] * ls, [False] * lt, 0
    for i, c in enumerate(s):
        for j in range(max(0, i - md), min(i + md + 1, lt)):
            if not tm[j] and t[j] == c:
                sm[i] = tm[j] = True
                m += 1
                break
    if not m:
        return 0.0
    k = tr = 0
    for i in range(ls):
        if sm[i]:
            while not tm[k]:
                k += 1
            if s[i] != t[k]:
                tr += 1
            k += 1
    return (m / ls + m / lt + (m - tr / 2) / m) / 3


def jw(s: str, t: str) -> float:
    j = jaro(s, t)
    prefix = 0
    for a, b in zip(s, t):
        if a == b and prefix < 4:
            prefix += 1
        else:
            break
    return round(j + prefix * 0.1 * (1 - j), 4)


def std_text(s: str) -> str:
    s = (s or "").lower().replace("st.", "st ")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return " ".join(s.split())


ADDR_RE = re.compile(r"^\s*(\d+)\s+(.+?),\s*([^,]+?),\s*([A-Z]{2})\s+(\d{5})\s*$")


def parse_address(full: str | None = None, street: str | None = None, city: str | None = None) -> dict | None:
    if full and not blank(full):
        m = ADDR_RE.match(full)
        if m:
            return {"number": m.group(1), "street": std_street(m.group(2)), "city": m.group(3).strip().lower(),
                    "state": m.group(4), "zip": m.group(5)}
    if street and not blank(street):
        m = re.match(r"^\s*(\d+)\s+(.+)$", street)
        if m:
            return {"number": m.group(1), "street": std_street(m.group(2)), "city": (city or "").strip().lower(),
                    "state": None, "zip": None}
    if city and not blank(city):
        return {"number": None, "street": None, "city": city.strip().lower(), "state": None, "zip": None}
    return None


def std_street(s: str) -> str:
    s = std_text(s)
    s = re.sub(r"\bdrive\b", "dr", s)
    s = re.sub(r"\broad\b", "rd", s)
    s = re.sub(r"\bstreet\b", "st", s)
    return s


def address_similarity(a: dict | None, b: dict | None) -> float | None:
    if not a or not b or not a.get("number") or not b.get("number"):
        return None
    same_place = (a.get("zip") and a.get("zip") == b.get("zip")) or (a.get("city") and a.get("city") == b.get("city"))
    if a["number"] != b["number"] or not same_place:
        return 0.0
    return round(0.5 + 0.5 * jw(a["street"], b["street"]), 4)


class NameMatcher:
    """Token-aware facility name similarity.

    Tokens shared by most facility names (brand + saint/hospital words) carry no identity, so the
    score is driven by the distinctive tokens (city / site words). Near-misses of common tokens
    ("Vincnt") are treated as common; extra distinctive tokens in a mention cost 10% each.
    """

    def __init__(self, anchor_names: list[str], brand_tokens: set[str]):
        counts = Counter()
        for n in anchor_names:
            counts.update(set(std_text(n).split()))
        groups = max(len(anchor_names), 1)
        self.common = {t for t, c in counts.items() if c / groups >= 0.5} | brand_tokens | SITE_DESCRIPTORS | {"st"}

    def distinctive(self, name: str) -> list[str]:
        out = []
        for tok in std_text(name).split():
            if tok in self.common or any(jw(tok, c) >= 0.9 for c in self.common if len(c) > 3):
                continue
            out.append(tok)
        return out

    def score(self, mention: str, anchor: str) -> float:
        a_tokens = self.distinctive(anchor)
        m_tokens = self.distinctive(mention)
        if not a_tokens or not m_tokens:
            return 0.0
        best = [max(jw(at, mt) for mt in m_tokens) for at in a_tokens]
        used = {max(m_tokens, key=lambda mt: jw(at, mt)) for at in a_tokens}
        extra = len([t for t in m_tokens if t not in used])
        return round(sum(best) / len(best) * (0.9 ** extra), 4)


# ─────────────────────────────────────────────────────────────────────────────
#  Profiling
# ─────────────────────────────────────────────────────────────────────────────
def infer_type(col: str, values: list[str]) -> str:
    vals = [v for v in values if not blank(v)]
    if not vals:
        return "empty"
    if all(DATE_RE.match(v) for v in vals):
        return "date"
    if all(fnum(v) is not None for v in vals) and not re.search(r"(_ID|_No|Number|Phone)", col):
        return "number"
    if re.search(r"(_ID|_No|_Number|Number|Tag|Serial|Document|_Order|Order$|Identifier)", col):
        return "identifier"
    if len(set(vals)) <= 8 and len(vals) >= 7:
        return "category"
    return "text"


def profile_sources(src: dict) -> dict:
    profiles = {}
    for s in SOURCES:
        data = src[s["code"]]
        rows = data["rows"]
        fields = []
        for col in data["columns"]:
            values = [r.get(col, "") for r in rows]
            filled = [v for v in values if not blank(v)]
            top = Counter(filled).most_common(3)
            fields.append({
                "field": col,
                "type": infer_type(col, values),
                "populated": len(filled),
                "eligible": len(values),
                "blank": len(values) - len(filled),
                "unique": len(set(filled)),
                "top_values": [{"value": v, "count": c} for v, c in top],
            })
        refresh = None
        if s["date_field"]:
            ds = [r[s["date_field"]] for r in rows if d(r.get(s["date_field"]))]
            refresh = max(ds) if ds else None
        profiles[s["code"]] = {
            "code": s["code"], "file": s["file"], "label": s["label"], "system": s["system"],
            "native_key": s["key"], "grain": s["grain"], "owner": s["owner"],
            "record_count": len(rows), "column_count": len(data["columns"]),
            "refresh_field": s["date_field"], "refresh_date": refresh, "fields": fields,
        }
    return profiles


# ─────────────────────────────────────────────────────────────────────────────
#  SQL execution
# ─────────────────────────────────────────────────────────────────────────────
def load_duckdb(src: dict, as_of: str) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    for s in SOURCES:
        cols = ["_rid"] + src[s["code"]]["columns"]
        con.execute(f'CREATE TABLE {s["table"]} ({", ".join(f"{json.dumps(c)} VARCHAR" for c in cols)})')
        rows = [[(None if blank(r.get(c)) else r.get(c)) for c in cols] for r in src[s["code"]]["rows"]]
        con.executemany(f'INSERT INTO {s["table"]} VALUES ({", ".join("?" * len(cols))})', rows)
    con.execute(f"SET VARIABLE as_of = DATE '{as_of}'")
    return con


def jsonable(v):
    if isinstance(v, (dt.date, dt.datetime)):
        return v.isoformat()
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


def run_sql_stage(con, stage: str, log: list, results: dict):
    for fname, table, st in SQL_STAGES:
        if st != stage:
            continue
        text = (SQL_DIR / fname).read_text(encoding="utf-8")
        entry = {"sql_file": fname, "output_table": table, "dialect": "DuckDB", "stage": stage,
                 "input_tables": SQL_INPUTS[fname], "exception_rules": SQL_EXCEPTIONS[fname], "parameters": {"as_of": "run as_of date"} if "as_of" in text else {},
                 "rule_ids": re.findall(r"rule:\s*([^|\n]+)", text)[0].strip().split(" / ") if "rule:" in text else []}
        try:
            body = "\n".join(line for line in text.splitlines() if not line.strip().startswith("--")).strip().rstrip(";")
            con.execute(f"CREATE OR REPLACE TABLE {table} AS {body}")
            cur = con.execute(f"SELECT * FROM {table}")
            cols = [c[0] for c in cur.description]
            rows = [[jsonable(v) for v in r] for r in cur.fetchall()]
            canon = json.dumps(rows, sort_keys=True, default=str).encode()
            entry.update(status="ok", row_count=len(rows), output_columns=cols, checksum=sha256(canon)[:16],
                         sample=[dict(zip(cols, r)) for r in rows[:5]])
            results[table] = [dict(zip(cols, r)) for r in rows]
        except Exception as exc:  # recorded, never hidden
            entry.update(status="failed", error=str(exc), row_count=0, output_columns=[], checksum=None, sample=[])
            results[table] = []
        log.append(entry)


# ─────────────────────────────────────────────────────────────────────────────
#  Pipeline core
# ─────────────────────────────────────────────────────────────────────────────
class Run:
    def __init__(self, src: dict, as_of: str):
        self.src = src
        self.as_of = dt.date.fromisoformat(as_of)
        self.rows = {code: data["rows"] for code, data in src.items()}
        self.by_rid = {r["_rid"]: r for rows in self.rows.values() for r in rows}
        self.rules: dict[str, dict] = {}
        self.findings: list[dict] = []
        self.review: list[dict] = []
        self.match_candidates: list[dict] = []
        self.relationships: list[dict] = []

    # ── rule bookkeeping ──────────────────────────────────────────────────
    def rule(self, rid, cls, dimension, files, fields, title, severity, applicability, expected, interpretation, eligible_rids):
        self.rules[rid] = dict(rule_id=rid, rule_version=RULESET_VERSION, class_=cls, dimension=dimension, files=files,
                               fields=fields, title=title, severity=severity, applicability=applicability,
                               expected=expected, interpretation=interpretation,
                               eligible_rids=sorted(set(eligible_rids)), affected_rids=[])

    def find(self, rid, row_rid, field, value, expected=None, evidence=None, severity=None, proposed=None):
        r = self.rules[rid]
        row = self.by_rid[row_rid]
        code = row_rid.split(":")[0]
        key_field = SRC[code]["key"].split(" + ")[-1]
        self.findings.append(dict(
            finding_id=f"{rid}|{row_rid}|{field}", rule_id=rid, source=code, source_row_id=row_rid,
            native_key=row.get(key_field, ""), field=field, original_value=value, expected=expected or r["expected"],
            proposed_value=proposed, evidence=evidence or "", severity=severity or r["severity"],
        ))
        if row_rid not in r["affected_rids"]:
            r["affected_rids"].append(row_rid)

    def completeness(self, rid, code, field, severity, interpretation, applies=lambda r: True, applicability="All rows"):
        rows = self.rows[code]
        elig = [r for r in rows if applies(r)]
        self.rule(rid, "Completeness", "completeness", [code], [field], f"{field} is populated", severity,
                  applicability, "Non-blank value", interpretation, [r["_rid"] for r in elig])
        for r in elig:
            if blank(r.get(field)):
                self.find(rid, r["_rid"], field, "")

    # ── stage 1: quality rules that need no matching ──────────────────────
    def run_basic_rules(self):
        R = self.rows
        c = self.completeness
        c("C-01-DHC", "01", "Definitive_Healthcare_ID", "medium", "Market-data ID used for enrichment; a gap blocks third-party enrichment, not transactions.")
        c("C-01-PARENT", "01", "Hierarchy_Parent_Reltio_ID", "high", "Facilities need a parent to roll up to the enterprise; enterprise parents are exempt.",
          applies=lambda r: r["Hierarchy_Level"] != "Enterprise Parent", applicability="Hierarchy_Level is not 'Enterprise Parent'")
        c("C-02-ADDR", "02", "Address", "medium", "Ship-to gaps affect delivery; payer gaps mostly affect correspondence.")
        c("C-02-PARENT", "02", "Parent_ERP_Customer_ID", "high", "Every non-parent ERP role should roll up to the enterprise account.",
          applies=lambda r: r["Account_Role"] != "PARENT", applicability="Account_Role is not PARENT")
        c("C-03-EMAIL", "03", "Business_Email", "medium", "Missing email limits recall and billing notices.")
        c("C-03-PHONE", "03", "Phone_Number", "low", "Phone is a secondary channel.")
        c("C-03-ACCT", "03", "Salesforce_Account_ID", "high", "A contact without an account cannot be routed to a facility.")
        c("C-04-STREET", "04", "Billing_Street", "medium", "Street is needed to corroborate CRM-to-ERP facility matches.")
        c("C-04-PARENT", "04", "Parent_Salesforce_Account_ID", "low",
          "Facility accounts have no CRM parent: the hierarchy lives only in Reltio and ERP. Check account type before treating as an error.",
          applies=lambda r: "Facility" in r["Account_Type"], applicability="Account_Type is a facility")
        c("C-05-ACCT", "05", "Salesforce_Account_ID", "high", "Contract cannot be tied to a facility or its orders.")
        c("C-05-DOC", "05", "Source_Document_Location", "low", "Signed document link missing; audit trail only.")
        c("C-05-END", "05", "Term_End_Date", "medium", "Entitlement window cannot be evaluated without an end date.")
        c("C-06-OWNER", "06", "Owning_ERP_Customer_No", "high", "Asset cannot be tied to the billing account without an owner ERP number.")
        c("C-06-SITE", "06", "Site_Name", "medium", "Site name is the main location evidence for an asset.")
        c("C-06-ADDR", "06", "Site_Address", "low", "Site name usually suffices; address corroborates.")
        c("C-06-UDI", "06", "Unique_Device_Identifier", "medium", "UDI supports recall traceability.")
        c("C-07-DEST", "07", "Destination_Location", "medium", "A movement without a destination cannot place the asset.")
        c("C-08-SITE", "08", "Customer_Site_Entered", "medium", "Visit site is location evidence.")
        c("C-09-SERIAL", "09", "Equipment_Serial", "medium", "Device-specific orders need a serial to reach the asset; consumables do not.",
          applies=lambda r: r["Order_Type"] != "Consumables", applicability="Order_Type is not Consumables")
        c("C-09-PAYER", "09", "Payer_No", "high", "Payer role missing on the order.")
        c("C-09-SHIPTO", "09", "Ship_To_No", "medium", "Ship-to role missing on the order.")
        c("C-09-PO", "09", "Customer_PO_Number", "info", "Only a defect when the covering contract requires a PO (see B-PO-01).")
        c("C-10-PAYER", "10", "Payer_Account_No", "high", "Invoice payer missing; collection routing depends on it.")
        c("C-10-NOTE", "10", "Collection_Note", "info", "Blank notes are normal on paid invoices; observed on open invoices only.",
          applies=lambda r: r["Clearing_Status"] == "Open", applicability="Clearing_Status is Open")

        # identifier presence: at least one strong identifier
        for rid, code, f1, f2 in (("C-07-IDS", "07", "Asset_Tag", "Scanned_Serial"), ("C-08-IDS", "08", "Equipment_Tag", "Observed_Serial")):
            self.rule(rid, "Completeness", "completeness", [code], [f1, f2], f"{f1} or {f2} is populated", "high",
                      "All rows", "At least one strong device identifier",
                      "Either identifier is sufficient; rows with neither cannot be linked to an asset.", [r["_rid"] for r in R[code]])
            for r in R[code]:
                if blank(r[f1]) and blank(r[f2]):
                    self.find(rid, r["_rid"], f"{f1} / {f2}", "")

        # validity: serial format
        serial_fields = [("06", "Serial_Number"), ("07", "Scanned_Serial"), ("08", "Observed_Serial"), ("09", "Equipment_Serial")]
        elig = [r["_rid"] for code, f in serial_fields for r in R[code] if not blank(r[f])]
        self.rule("V-SERIAL", "Validity", "validity", [c for c, _ in serial_fields], [f for _, f in serial_fields],
                  "Serial matches PREFIX-YYYY-NNNNNN", "high", "Populated serial values", "(ADC|INF)-YYYY-NNNNNN, digits only after the prefix",
                  "Letter O typed for zero breaks exact joins to the install base; normalization proposes the digit.", elig)
        for code, f in serial_fields:
            for r in R[code]:
                v = r[f]
                if not blank(v) and not SERIAL_RE.match(v):
                    self.find("V-SERIAL", r["_rid"], f, v, proposed=norm_serial(v),
                              evidence=f"'{v}' fails pattern; normalized form '{norm_serial(v)}'")

        self.rule("V-UDI", "Validity", "validity", ["06"], ["Unique_Device_Identifier"], "UDI matches UDI-NNNN-NNNNNNNN", "medium",
                  "Populated UDI values", "UDI-NNNN-NNNNNNNN", "Format check only.",
                  [r["_rid"] for r in R["06"] if not blank(r["Unique_Device_Identifier"])])
        for r in R["06"]:
            v = r["Unique_Device_Identifier"]
            if not blank(v) and not UDI_RE.match(v):
                self.find("V-UDI", r["_rid"], "Unique_Device_Identifier", v)

        # email domain against the dominant customer domain
        cust = [r for r in R["03"] if not blank(r["Business_Email"]) and r["BD_Contact_Type"] != "BD Sales Representative"]
        domains = Counter(r["Business_Email"].split("@")[-1] for r in cust)
        main_domain = domains.most_common(1)[0][0] if domains else ""
        self.rule("V-EMAIL", "Validity", "validity", ["03"], ["Business_Email"], "Email domain matches the customer domain", "medium",
                  "Populated customer contact emails", f"name@{main_domain}",
                  f"{domains[main_domain]} of {len(cust)} customer emails use {main_domain}; a different host is likely a typo.",
                  [r["_rid"] for r in cust])
        for r in cust:
            dom = r["Business_Email"].split("@")[-1]
            if dom != main_domain:
                proposed = r["Business_Email"].split("@")[0] + "@" + main_domain
                self.find("V-EMAIL", r["_rid"], "Business_Email", r["Business_Email"], proposed=proposed,
                          evidence=f"domain '{dom}' differs from {main_domain} (typo-like prefix)")

        # chronology and amount validity
        checks = [
            ("06", "Install_Date", "Equipment_Confirmation_Date", "Install date on or before confirmation date"),
            ("05", "Term_Begin_Date", "Term_End_Date", "Contract begins before it ends"),
            ("10", "Billing_Date", "Net_Due_Date", "Invoice billed on or before due date"),
        ]
        elig = [r["_rid"] for code, a, b, _ in checks for r in R[code] if d(r[a]) and d(r[b])]
        self.rule("V-CHRONO", "Validity", "validity", ["05", "06", "10"], [a + " <= " + b for _, a, b, _ in checks],
                  "Dates are in a possible order", "high", "Rows where both dates parse", "earlier date <= later date",
                  "Impossible sequences indicate keying or load errors.", elig)
        for code, a, b, label in checks:
            for r in R[code]:
                if d(r[a]) and d(r[b]) and d(r[a]) > d(r[b]):
                    self.find("V-CHRONO", r["_rid"], f"{a} / {b}", f"{r[a]} > {r[b]}", evidence=label)
        orders = {r["SAP_Sales_Order"]: r for r in R["09"]}
        self.rule("V-AR-STATUS", "Validity", "validity", ["10"], ["Clearing_Status", "Open_Amount_USD"],
                  "Clearing status agrees with open amount", "medium", "All invoices",
                  "Open => open amount > 0; Paid => open amount = 0; 0 <= open <= billed",
                  "Status/amount disagreement makes aging unreliable; amount is used for exposure, status is flagged.", [r["_rid"] for r in R["10"]])
        for r in R["10"]:
            amt, billed = fnum(r["Open_Amount_USD"]), fnum(r["Billing_Amount_USD"])
            bad = (r["Clearing_Status"] == "Open" and amt == 0) or (r["Clearing_Status"] == "Paid" and (amt or 0) > 0) \
                or amt is None or billed is None or amt < 0 or amt > billed
            if bad:
                self.find("V-AR-STATUS", r["_rid"], "Clearing_Status", f"{r['Clearing_Status']} / open {r['Open_Amount_USD']}",
                          proposed="Cleared (confirm with AR)" if amt == 0 else None,
                          evidence=f"status '{r['Clearing_Status']}' with open amount {r['Open_Amount_USD']} of {r['Billing_Amount_USD']}")
        self.rule("V-ORDER-INV", "Validity", "validity", ["09", "10"], ["Order_Created_On", "Billing_Date"],
                  "Invoice is billed on or after its order", "medium", "Invoices with a resolvable order", "Order_Created_On <= Billing_Date",
                  "Billing before ordering suggests a wrong reference.",
                  [r["_rid"] for r in R["10"] if r["Reference_Sales_Order"] in orders])
        for r in R["10"]:
            o = orders.get(r["Reference_Sales_Order"])
            if o and d(o["Order_Created_On"]) and d(r["Billing_Date"]) and d(o["Order_Created_On"]) > d(r["Billing_Date"]):
                self.find("V-ORDER-INV", r["_rid"], "Billing_Date", r["Billing_Date"], evidence=f"order created {o['Order_Created_On']}")

        # uniqueness of native IDs
        ids = Counter(r["ERP_Customer_ID"] for r in R["02"])
        self.rule("U-02-NATIVE", "Uniqueness", "consistency", ["02"], ["ERP_Customer_ID"], "ERP_Customer_ID is unique in the extract", "high",
                  "All rows", "One row per ERP_Customer_ID",
                  "The same native ID in two ERP systems means the key is (ERP_System, ERP_Customer_ID); names must still agree.",
                  [r["_rid"] for r in R["02"]])
        for r in R["02"]:
            if ids[r["ERP_Customer_ID"]] > 1:
                self.find("U-02-NATIVE", r["_rid"], "ERP_Customer_ID", r["ERP_Customer_ID"],
                          evidence=f"{r['ERP_System']}: '{r['Legal_Name']}'")
        serials = Counter(norm_serial(r["Serial_Number"]) for r in R["06"] if not blank(r["Serial_Number"]))
        self.rule("U-06-SERIAL", "Uniqueness", "consistency", ["06"], ["Serial_Number"], "Normalized serial is unique in the install base", "high",
                  "Populated serials", "One asset per serial", "Duplicate serials would make asset resolution ambiguous.",
                  [r["_rid"] for r in R["06"] if not blank(r["Serial_Number"])])
        for r in R["06"]:
            if not blank(r["Serial_Number"]) and serials[norm_serial(r["Serial_Number"])] > 1:
                self.find("U-06-SERIAL", r["_rid"], "Serial_Number", r["Serial_Number"])

        # referential integrity inside a source
        reltio_ids = {r["Reltio_Record_ID"] for r in R["01"]}
        self.rule("R-01-PARENT", "Referential integrity", "linkability", ["01"], ["Hierarchy_Parent_Reltio_ID"],
                  "Parent Reltio ID exists in the extract", "high", "Populated parent IDs", "Existing Reltio_Record_ID",
                  "An orphan parent breaks the enterprise roll-up.", [r["_rid"] for r in R["01"] if not blank(r["Hierarchy_Parent_Reltio_ID"])])
        for r in R["01"]:
            p = r["Hierarchy_Parent_Reltio_ID"]
            if not blank(p) and p not in reltio_ids:
                self.find("R-01-PARENT", r["_rid"], "Hierarchy_Parent_Reltio_ID", p, evidence=f"{p} not in extract")
        erp_ids = {r["ERP_Customer_ID"] for r in R["02"]}
        self.rule("R-02-PARENT", "Referential integrity", "linkability", ["02"], ["Parent_ERP_Customer_ID"],
                  "Parent ERP account exists", "high", "Populated parent IDs", "Existing ERP_Customer_ID",
                  "An orphan parent splits the enterprise in ERP reporting.", [r["_rid"] for r in R["02"] if not blank(r["Parent_ERP_Customer_ID"])])
        for r in R["02"]:
            p = r["Parent_ERP_Customer_ID"]
            if not blank(p) and p not in erp_ids:
                self.find("R-02-PARENT", r["_rid"], "Parent_ERP_Customer_ID", p, evidence=f"{p} not in extract")
        self.rule("R-06-OWNER", "Referential integrity", "linkability", ["06"], ["Owning_ERP_Customer_No"],
                  "Owner ERP number exists in SAP accounts", "high", "Populated owner numbers", "Existing ERP_Customer_ID",
                  "Unknown owners cannot be billed.", [r["_rid"] for r in R["06"] if not blank(r["Owning_ERP_Customer_No"])])
        for r in R["06"]:
            p = r["Owning_ERP_Customer_No"]
            if not blank(p) and p not in erp_ids:
                self.find("R-06-OWNER", r["_rid"], "Owning_ERP_Customer_No", p)

        # freshness
        for rid, code, field, label in (("F-01-VERIFIED", "01", "MDM_Last_Verified", "MDM verification"),
                                        ("F-03-ACTIVITY", "03", "Last_Activity_Date", "contact activity")):
            elig = [r for r in R[code] if d(r[field])]
            self.rule(rid, "Freshness / conflict", "consistency", [code], [field], f"{label} within 12 months of the run date", "low",
                      f"Rows with a {field}", f">= {(self.as_of - dt.timedelta(days=365)).isoformat()}",
                      "Stale records are evidence of lower trust, not errors on their own.", [r["_rid"] for r in elig])
            for r in elig:
                if (self.as_of - d(r[field])).days > 365:
                    self.find(rid, r["_rid"], field, r[field], evidence=f"{(self.as_of - d(r[field])).days} days old")
        elig = [r for r in R["06"] if r["Install_Base_Status"] == "Active" and d(r["Warranty_End_Date"])]
        self.rule("F-06-WARRANTY", "Freshness / conflict", "consistency", ["06"], ["Warranty_End_Date"],
                  "Active asset warranty not yet ended", "info", "Active assets with a warranty date",
                  f"Warranty_End_Date >= {self.as_of.isoformat()}", "Service entitlement shifts to contract once warranty ends.",
                  [r["_rid"] for r in elig])
        for r in elig:
            if d(r["Warranty_End_Date"]) < self.as_of:
                self.find("F-06-WARRANTY", r["_rid"], "Warranty_End_Date", r["Warranty_End_Date"])

    # ── stage 2: facility matching ────────────────────────────────────────
    def match_facilities(self):
        R = self.rows
        parent = next(r for r in R["01"] if r["Hierarchy_Level"] == "Enterprise Parent")
        brand = set(std_text(parent["DBA_Name"]).split())
        self.brand_tokens = brand

        groups: dict[str, list[dict]] = defaultdict(list)
        ent_rows = []
        for r in R["02"]:
            m = re.match(r"^ERP-(\d{3})-[A-Z]$", r["ERP_Customer_ID"])
            if m:
                groups[m.group(1)].append(r)
            else:
                ent_rows.append(r)
        self.erp_groups = dict(sorted(groups.items()))
        anchor_names = []
        for g, rows in self.erp_groups.items():
            names = Counter(r["Legal_Name"] for r in rows)
            anchor_names.append(names.most_common(1)[0][0])
        self.nm = NameMatcher(anchor_names, brand)

        self.facilities: dict[str, dict] = {}
        for g, rows in self.erp_groups.items():
            gid = f"GF-{g}"
            names = Counter(r["Legal_Name"] for r in rows)
            addrs = [parse_address(r["Address"]) for r in rows if not blank(r["Address"])]
            addr = Counter(json.dumps(a, sort_keys=True) for a in addrs).most_common(1)[0][0] if addrs else None
            sold_to = next((r["ERP_Customer_ID"] for r in rows if "SOLD_TO" in r["Account_Role"]), None)
            payer = next((r["ERP_Customer_ID"] for r in rows if "PAYER" in r["Account_Role"]), None)
            self.facilities[gid] = dict(golden_id=gid, erp_group=g, erp_names=names, address=json.loads(addr) if addr else None,
                                        sold_to=sold_to, payer=payer, erp_systems=sorted({r["ERP_System"] for r in rows}),
                                        crosswalk=[], name_variants=Counter())
            for r in rows:
                self.facilities[gid]["crosswalk"].append(dict(
                    source="02", table="sap_accounts", native_id=r["ERP_Customer_ID"], rid=r["_rid"], system=r["ERP_System"],
                    role=r["Account_Role"], name=r["Legal_Name"], address=r["Address"], status="native", score=1.0,
                    method="ERP account number structure ERP-<facility>-<role>", review_item=None))
        self.enterprise = dict(golden_id="GP-001", reltio=parent, erp_rows=ent_rows)

        # score Reltio facilities and SF accounts against ERP facility anchors
        cand_by_source = defaultdict(list)
        for code, rows in (("01", [r for r in R["01"] if r["Hierarchy_Level"] != "Enterprise Parent"]), ("04", R["04"])):
            for r in rows:
                if code == "01":
                    names = [r["Legal_Name"], r["DBA_Name"]]
                    a = parse_address(r["Hierarchy_Account_Address"])
                    native = r["Reltio_Record_ID"]
                else:
                    names = [r["Account_Name"]]
                    a = parse_address(street=r["Billing_Street"], city=r["Billing_City"])
                    native = r["Salesforce_Account_ID"]
                scored = []
                for gid, f in self.facilities.items():
                    name_sim = max(self.nm.score(n, an) for n in names if not blank(n) for an in f["erp_names"])
                    addr_sim = address_similarity(a, f["address"])
                    city_ok = bool(a and f["address"] and a.get("city") == f["address"].get("city"))
                    if addr_sim is None:
                        score = name_sim * (1.0 if city_ok else 0.9)
                    else:
                        score = 0.5 * name_sim + 0.5 * addr_sim
                    scored.append((round(score, 4), gid, name_sim, addr_sim, city_ok))
                scored.sort(key=lambda x: (-x[0], x[1]))
                best = scored[0]
                second = scored[1][0] if len(scored) > 1 else 0
                cand = dict(candidate_id=f"MC-{native}", entity_type="facility", source=code, rid=r["_rid"], native_id=native,
                            name=names[0], address=r.get("Hierarchy_Account_Address") or ", ".join(x for x in (r.get("Billing_Street", ""), r.get("Billing_City", "")) if x),
                            golden_facility_id=best[1], score=best[0], margin=round(best[0] - second, 4),
                            features=dict(name_similarity=best[2], address_similarity=best[3], city_match=best[4]),
                            method="token-aware Jaro-Winkler on distinctive name tokens + street/number/zip address match",
                            matcher_version=MATCHER_VERSION, row=r)
                cand["band"] = "auto" if best[0] >= AUTO_THRESHOLD else "review" if best[0] >= REVIEW_THRESHOLD else "no_match"
                cand_by_source[(code, best[1])].append(cand)

        for (code, gid), cands in sorted(cand_by_source.items()):
            def rank(c):
                row = c["row"]
                active = (row.get("Record_Status") or row.get("Account_Status")) == "Active"
                verified = row.get("MDM_Last_Verified") or row.get("Last_Modified_Date") or ""
                return (-c["score"], not active, "" if not verified else "~" + verified[::-1], c["native_id"])
            cands.sort(key=rank)
            survivor = cands[0]
            for c in cands:
                c["same_source_duplicate"] = len(cands) > 1
                c["survivor_native_id"] = survivor["native_id"]
                if c is survivor:
                    status = "auto" if c["band"] == "auto" else "review" if c["band"] == "review" else "no_match"
                else:
                    status = "review" if c["band"] != "no_match" else "no_match"
                c["status"] = status
                self.match_candidates.append(c)

    # ── stage 3: mention linking (site names typed into operational systems) ─
    def link_mention(self, text: str) -> dict:
        if blank(text):
            return dict(golden_facility_id=None, score=0.0, band="blank")
        best = []
        for gid, f in self.facilities.items():
            s = max(self.nm.score(text, n) for n in f["all_names"])
            best.append((s, gid))
        best.sort(key=lambda x: (-x[0], x[1]))
        s, gid = best[0]
        margin = s - (best[1][0] if len(best) > 1 else 0)
        band = "auto" if s >= AUTO_THRESHOLD and margin >= 0.1 else "review" if s >= REVIEW_THRESHOLD and margin >= 0.05 else "unresolved"
        return dict(golden_facility_id=gid if band != "unresolved" else None, candidate=gid, score=s, margin=round(margin, 4), band=band)

    def build_facility_names(self):
        for gid, f in self.facilities.items():
            names = set(f["erp_names"])
            for c in self.match_candidates:
                if c["golden_facility_id"] == gid and c["status"] in ("auto", "review"):
                    row = c["row"]
                    names.update(n for n in (row.get("Legal_Name"), row.get("DBA_Name"), row.get("Account_Name")) if not blank(n))
            f["all_names"] = sorted(names)
            survivor = next((c for c in self.match_candidates if c["golden_facility_id"] == gid and c["source"] == "01" and c["status"] == "auto"), None)
            f["reltio_survivor"] = survivor["row"] if survivor else None
            f["display_name"] = survivor["row"]["DBA_Name"] if survivor else f["erp_names"].most_common(1)[0][0]
            f["city"] = (f["address"] or {}).get("city", "").title()

    # ── stage 4: assets, timelines, relationships ─────────────────────────
    def resolve_assets(self, sql: dict):
        R = self.rows
        res = {(x["source"], x["source_row_id"]): x for x in sql["q_asset_resolution"]}
        self.asset_resolution = res
        self.assets: dict[str, dict] = {}
        for r in R["06"]:
            site = self.link_mention(r["Site_Name"])
            addr_fac = None
            a = parse_address(r["Site_Address"]) if not blank(r["Site_Address"]) else None
            if a:
                for gid, f in self.facilities.items():
                    if (address_similarity(a, f["address"]) or 0) >= 0.99:
                        addr_fac = gid
            owner_fac = next((gid for gid, f in self.facilities.items()
                              if any(x["native_id"] == r["Owning_ERP_Customer_No"] for x in f["crosswalk"])), None) if not blank(r["Owning_ERP_Customer_No"]) else None
            ib_fac = site["golden_facility_id"] or addr_fac or owner_fac
            ib_basis = "site name" if site["golden_facility_id"] else "site address" if addr_fac else "owner ERP number" if owner_fac else None
            self.assets[r["Electronic_Asset_ID"]] = dict(
                asset_id=r["Electronic_Asset_ID"], rid=r["_rid"], serial=r["Serial_Number"], serial_normalized=norm_serial(r["Serial_Number"]),
                product_family=r["Product_Family"], material=r["Material_ID"], udi=r["Unique_Device_Identifier"],
                status=r["Install_Base_Status"], software=r["Software_Version"], warranty_end=r["Warranty_End_Date"],
                install_date=r["Install_Date"], confirmed=r["Equipment_Confirmation_Date"], location_label=r["Equipment_Location"],
                site_name=r["Site_Name"], site_link=site, ib_facility=ib_fac, ib_basis=ib_basis,
                owner_raw=r["Owning_ERP_Customer_No"], owner_facility=owner_fac, timeline=[], orders=[])
        for ev in sql["q_asset_event_timeline"]:
            a = self.assets.get(ev["asset_id"])
            if not a:
                continue
            link = self.link_mention(ev["location_text"]) if ev["event_type"] != "install_base" else a["site_link"]
            fac = link["golden_facility_id"]
            if ev["event_type"] == "install_base":
                fac = a["ib_facility"]
            a["timeline"].append(dict(date=ev["event_date"], type=ev["event_type"], rid=ev["source_row_id"], text=ev["location_text"] or "",
                                      evidence_source=ev["evidence_source"], facility=fac, link_score=link["score"], link_band=link["band"]))
        for a in self.assets.values():
            a["timeline"].sort(key=lambda e: (e["date"] or "", e["type"]))
            self._locate(a)

    def _locate(self, a: dict):
        moves = [e for e in a["timeline"] if e["type"].startswith("movement_")]
        installs = [e for e in moves if e["type"] == "movement_install"]
        relocations = [e for e in moves if e["type"] == "movement_asset_move" and e["facility"]]
        ib = a["ib_facility"]
        a["install_facility"] = installs[0]["facility"] if installs and installs[0]["facility"] else ib
        if not relocations:
            a.update(proposed_facility=ib, location_status="consistent" if ib else "unknown", location_confidence=1.0 if ib else 0.0,
                     location_evidence=[], moved_on=None, moved_from=None, move_target=None)
            return
        last = relocations[-1]
        prior = [e for e in moves if e["date"] and last["date"] and e["date"] < last["date"] and e["facility"]]
        moved_from = prior[-1]["facility"] if prior else a["install_facility"]
        a["moved_on"], a["moved_from"], a["move_target"] = last["date"], moved_from, last["facility"]
        if last["facility"] == ib:
            a.update(proposed_facility=ib, location_status="consistent", location_confidence=1.0,
                     location_evidence=[f"Install base already shows the post-move site ({last['date']})"])
            return
        src = last["evidence_source"]
        conf = 0.75 if src in ("Customer Notice", "Service Call") else 0.55
        ev = [f"{src} on {last['date']} moves the asset to {self.facilities[last['facility']]['display_name']} (base {conf:.2f})"]
        later_service = [e for e in a["timeline"] if e["type"] == "service_visit" and e["date"] and e["date"] >= last["date"]]
        if any(e["facility"] == last["facility"] for e in later_service):
            conf += 0.15
            ev.append("A later service visit was recorded at the new site (+0.15)")
        if any(e["facility"] not in (None, last["facility"]) for e in later_service):
            conf -= 0.10
            ev.append("A later service visit was recorded elsewhere (-0.10)")
        if a["confirmed"] and last["date"] and a["confirmed"] > last["date"] and ib and ib != last["facility"]:
            conf -= 0.20
            ev.append(f"Install base was confirmed at the old site on {a['confirmed']}, after the move (-0.20)")
        conf = round(max(0.0, min(conf, 0.97)), 2)
        a.update(proposed_facility=last["facility"] if conf >= 0.5 else ib, location_status="conflict",
                 location_confidence=conf, location_evidence=ev)

    def location_on(self, a: dict, day: str | None):
        if not day:
            return a["proposed_facility"]
        loc = a["install_facility"] or a["ib_facility"]
        for e in a["timeline"]:
            if e["type"].startswith("movement_") and e["facility"] and e["date"] and e["date"] <= day:
                loc = e["facility"]
        return loc

    def facility_of_account(self, account_no: str | None):
        if blank(account_no):
            return None
        for gid, f in self.facilities.items():
            if any(x["native_id"] == account_no and x["table"] == "sap_accounts" for x in f["crosswalk"]):
                return gid
        return None

    # ── stage 5: cross-source rules that need matching ────────────────────
    def run_linked_rules(self, sql: dict):
        R = self.rows
        F = self.facilities
        # name consistency: every typed facility name vs its golden display name
        mentions = []
        for code, field in (("01", "Legal_Name"), ("02", "Legal_Name"), ("04", "Account_Name"), ("06", "Site_Name"),
                            ("07", "Destination_Location"), ("08", "Customer_Site_Entered")):
            for r in R[code]:
                if blank(r[field]) or (code == "02" and not re.match(r"^ERP-\d{3}", r["ERP_Customer_ID"])):
                    continue
                if code == "01" and r["Hierarchy_Level"] == "Enterprise Parent":
                    continue
                link = self.link_mention(r[field])
                mentions.append((code, field, r, link))
        self.mentions = mentions
        self.rule("S-NAME", "Consistency", "consistency", sorted({m[0] for m in mentions}), ["facility name fields"],
                  "Facility name matches the golden display name", "medium", "Populated facility-name values",
                  "Golden display name (Reltio DBA where matched)",
                  "Name alone never creates a confirmed join; standardization keeps originals and proposes the display form.",
                  [m[2]["_rid"] for m in mentions])
        for code, field, r, link in mentions:
            gid = link["golden_facility_id"] or link["candidate"]
            target = F[gid]["display_name"]
            if r[field] != target and r[field] not in F[gid]["erp_names"] or (link["band"] != "auto"):
                if std_text(r[field]) == std_text(target):
                    continue
                sev = "low" if link["band"] == "auto" else "medium"
                self.find("S-NAME", r["_rid"], field, r[field], proposed=target if link["band"] != "unresolved" else None, severity=sev,
                          evidence=f"similarity {link['score']:.2f} to {target} ({link['band']})")
            F[gid]["name_variants"][r[field]] += 1

        # cross-source duplicates (identity candidates)
        dup = [c for c in self.match_candidates if c["same_source_duplicate"]]
        self.rule("U-DUP-ENTITY", "Uniqueness", "consistency", ["01", "04"], ["record identity"],
                  "One record per facility within a source", "high", "Facility-level Reltio profiles and Salesforce accounts",
                  "One survivor per golden facility per source",
                  "Separate same-entity candidates from true duplicate rows; merges are proposed, never forced.",
                  [c["rid"] for c in self.match_candidates])
        for c in dup:
            if c["native_id"] != c["survivor_native_id"]:
                self.find("U-DUP-ENTITY", c["rid"], "record identity", c["native_id"], proposed=f"same entity as {c['survivor_native_id']}",
                          evidence=f"score {c['score']:.2f} vs survivor {c['survivor_native_id']} at {F[c['golden_facility_id']]['display_name']}")

        # address variant consistency (street names for the same number + zip)
        self.rule("S-ADDR", "Consistency", "consistency", ["01", "02", "04", "06"], ["address fields"],
                  "Street matches the facility's ERP address", "low", "Addresses that parse to the same number and city",
                  "Same street text", "Street variants corroborate a match but need standardizing.",
                  [c["rid"] for c in self.match_candidates if c["features"]["address_similarity"] is not None])
        for c in self.match_candidates:
            s = c["features"]["address_similarity"]
            if s is not None and 0.5 < s < 1.0:
                fac_addr = F[c["golden_facility_id"]]["address"]
                self.find("S-ADDR", c["rid"], "address", c["address"], proposed=f"{fac_addr['number']} {fac_addr['street'].title()}",
                          evidence=f"address similarity {s:.2f}")

        # referential: movement / service / order identifiers -> asset
        res = self.asset_resolution
        for code, label in (("07", "movement"), ("08", "service visit"), ("09", "order serial")):
            elig = [r for r in R[code] if (code, r["_rid"]) in res]
            rid = f"R-{code}-ASSET"
            self.rule(rid, "Referential integrity", "linkability", [code], ["asset identifiers"],
                      f"{label} identifiers resolve to exactly one installed asset", "high", "Rows with at least one identifier",
                      "Exactly one asset after serial normalization",
                      "Rows resolving only after normalization are flagged so the source can be corrected.", [r["_rid"] for r in elig])
            for r in elig:
                x = res[(code, r["_rid"])]
                if x["candidate_assets"] != 1:
                    self.find(rid, r["_rid"], "asset identifiers", "", evidence=f"{x['candidate_assets']} candidate assets")
                elif not x["matched_without_normalization"]:
                    self.find(rid, r["_rid"], "asset identifiers", r.get("Scanned_Serial") or r.get("Observed_Serial") or r.get("Equipment_Serial"),
                              severity="medium", proposed=x["asset_id"], evidence=f"resolves to {x['asset_id']} only after serial normalization")

        # contact / contract account references
        for code, table, rid in (("03", "q_contact_account", "R-03-ACCT"), ("05", "q_contract_account", "R-05-ACCT")):
            rows = sql[table]
            rid_field = "contact_rid" if code == "03" else "contract_rid"
            elig = [x for x in rows if x["join_status"] != "unresolved_missing_key"]
            self.rule(rid, "Referential integrity", "linkability", [code], ["Salesforce_Account_ID"],
                      "Salesforce account exists in the accounts extract", "medium", "Populated account IDs",
                      "Existing Salesforce_Account_ID", "References outside the extract may be valid (e.g. internal users); flagged, not deleted.",
                      [x[rid_field] for x in elig])
            for x in elig:
                if x["join_status"] == "unresolved_not_in_extract":
                    self.find(rid, x[rid_field], "Salesforce_Account_ID", x["Salesforce_Account_ID"], evidence="ID not present in 04_salesforce_accounts")

        # order role / system consistency
        roles = sql["q_order_account_roles"]
        self.rule("S-ORDER-SYS", "Consistency", "consistency", ["09"], ["SAP_Client"], "Order system matches the account master system", "medium",
                  "Orders with a resolvable sold-to", "SAP_Client = ERP_System of Sold_To_No",
                  "An order booked in a different ERP than its account suggests a migration leftover.",
                  [x["order_rid"] for x in roles if x["role"] == "SOLD_TO" and x["account_found"]])
        for x in roles:
            if x["role"] == "SOLD_TO" and x["account_found"] and not x["system_matches"]:
                self.find("S-ORDER-SYS", x["order_rid"], "SAP_Client", x["SAP_Client"], evidence=f"{x['account_no']} is mastered in {x['account_system']}")
        self.rule("S-ORDER-ROLE", "Consistency", "consistency", ["09"], ["Sold_To_No", "Ship_To_No", "Bill_To_No", "Payer_No"],
                  "Each order role points to an account with that role", "medium", "Populated order roles", "Account_Role contains the role",
                  "Roles are relationships, not interchangeable customer fields.",
                  [x["order_rid"] for x in roles if x["account_no"]])
        for x in roles:
            if x["account_no"] and (not x["account_found"] or not x["role_matches"]):
                self.find("S-ORDER-ROLE", x["order_rid"], x["role"], x["account_no"], evidence="account missing" if not x["account_found"] else "role not carried by account")

        # invoice payer consistency
        pay = sql["q_invoice_payer_consistency"]
        self.rule("B-PAYER-01", "Business rule", "consistency", ["10", "09"], ["Payer_Account_No", "Payer_No"],
                  "Invoice payer agrees with the order payer", "high", "Invoices where both payers are present", "Equal payer accounts",
                  "Disagreement would route collections to the wrong party.", [x["invoice_rid"] for x in pay if x["payer_status"] == "consistent" or x["payer_status"] == "conflict"])
        for x in pay:
            if x["payer_status"] == "conflict":
                self.find("B-PAYER-01", x["invoice_rid"], "Payer_Account_No", x["invoice_payer"], evidence=f"order payer {x['order_payer']}")
        self.pay = {x["SAP_Billing_Document"]: x for x in pay}

    # ── stage 6: entitlement & PO rules (after xwalk is in DuckDB) ────────
    def run_entitlement_rules(self, sql: dict):
        ent = sql["q_order_entitlement"]
        self.entitlement = {x["SAP_Sales_Order"]: x for x in ent}
        self.rule("B-ENTITLE-01", "Business rule", "consistency", ["09", "05"], ["Material_Number", "Contract_Status", "Term_End_Date"],
                  "Ordered material is covered by an active contract term", "high", "Orders whose facility has a linked contract for the material",
                  "Active contract with order date inside the term",
                  "Billing on an expired or open-ended entitlement needs contract review before claiming an error.",
                  [x["order_rid"] for x in ent if x["Contract_ID"]])
        for x in ent:
            if x["Contract_ID"] and x["entitlement_status"] != "covered":
                self.find("B-ENTITLE-01", x["order_rid"], "Material_Number", x["Material_Number"],
                          evidence=f"{x['Contract_ID']} is {x['Contract_Status']}, term end {x['term_end'] or 'missing'} ({x['entitlement_status']})")
        self.rule("B-PO-01", "Business rule", "consistency", ["09", "05"], ["Customer_PO_Number", "PO_Required"],
                  "PO present when the covering contract requires one", "medium", "Orders covered by a contract with PO_Required = Y",
                  "Customer_PO_Number populated", "Missing PO on PO-required contracts commonly delays payment.",
                  [x["order_rid"] for x in ent if x["PO_Required"] == "Y"])
        for x in ent:
            if x["PO_Required"] == "Y" and x["po_missing"]:
                self.find("B-PO-01", x["order_rid"], "Customer_PO_Number", "", evidence=f"{x['Contract_ID']} requires a PO")

        # order vs asset location at order date
        R = self.rows
        inv_by_order = {r["Reference_Sales_Order"]: r for r in R["10"]}
        elig, self.order_asset = [], {}
        for o in R["09"]:
            x = self.asset_resolution.get(("09", o["_rid"]))
            if not x or x["candidate_assets"] != 1:
                continue
            a = self.assets[x["asset_id"]]
            a["orders"].append(o["SAP_Sales_Order"])
            fac = self.facility_of_account(o["Sold_To_No"])
            at_order = self.location_on(a, o["Order_Created_On"])
            status = "consistent"
            if a["moved_on"] and a["location_status"] == "conflict" or (a["moved_on"] and a["proposed_facility"] != fac):
                if fac == a["moved_from"] and o["Order_Created_On"] > a["moved_on"]:
                    status = "billed_to_prior_site_after_move"
                elif fac == a["moved_from"] and o["Order_Created_On"] <= a["moved_on"]:
                    status = "asset_moved_after_order"
            if status == "consistent" and at_order and fac and at_order != fac:
                status = "site_mismatch"
            self.order_asset[o["SAP_Sales_Order"]] = dict(asset_id=a["asset_id"], order_facility=fac, asset_facility_at_order=at_order,
                                                         asset_proposed_facility=a["proposed_facility"], status=status)
            elig.append(o["_rid"])
        self.rule("B-ORDER-LOC", "Business rule", "consistency", ["09", "06", "07"], ["Sold_To_No", "Equipment_Serial"],
                  "Order sold-to facility matches the asset's location", "high", "Orders whose serial resolves to one asset",
                  "Sold-to facility = asset facility at order date, and no later move away from it",
                  "Moves after billing leave invoices tied to the prior facility; evidence timeline decides, not the latest note.", elig)
        for so, x in self.order_asset.items():
            if x["status"] != "consistent":
                o = next(r for r in R["09"] if r["SAP_Sales_Order"] == so)
                inv = inv_by_order.get(so)
                self.find("B-ORDER-LOC", o["_rid"], "Sold_To_No", o["Sold_To_No"],
                          severity="high" if x["status"] != "asset_moved_after_order" else "medium",
                          evidence=f"{x['asset_id']} {x['status'].replace('_', ' ')}; asset now proposed at {self.fname(x['asset_proposed_facility'])}"
                          + (f"; invoice {inv['SAP_Billing_Document']} open {inv['Open_Amount_USD']}" if inv and (fnum(inv['Open_Amount_USD']) or 0) > 0 else ""))
        # asset location conflict as its own rule
        self.rule("F-ASSET-LOC", "Freshness / conflict", "consistency", ["06", "07", "08"], ["Site_Name", "Destination_Location", "Customer_Site_Entered"],
                  "Install base site agrees with movement and service evidence", "high", "Assets with at least one relocation event",
                  "Install base site = post-move site", "The latest note is evidence, not truth; confidence is scored from the timeline.",
                  [a["rid"] for a in self.assets.values() if a["moved_on"]])
        for a in self.assets.values():
            if a["location_status"] == "conflict":
                self.find("F-ASSET-LOC", a["rid"], "Site_Name", a["site_name"], proposed=self.fname(a["proposed_facility"]),
                          evidence="; ".join(a["location_evidence"]))

    def fname(self, gid):
        return self.facilities[gid]["display_name"] if gid in self.facilities else "unknown"

    # ── stage 7: review queue ─────────────────────────────────────────────
    def add_review(self, queue, entity_type, issue_type, title, why, source_rids, old, proposed, evidence, rule_id, confidence,
                   severity, owner, decisions, downstream=None, affected_count=None, extra=None):
        n = sum(1 for x in self.review if x["queue"] == queue) + 1
        prefix = {"normalization": "NRM", "identity": "IDM", "relationship": "REL", "unresolved": "UNR"}[queue]
        item = dict(review_id=f"RV-{prefix}-{n:03d}", queue=queue, entity_type=entity_type, issue_type=issue_type, title=title,
                    why_flagged=why, source_row_ids=source_rids, old_value=old, proposed_value=proposed, evidence=evidence,
                    rule_id=rule_id, rule_version=RULESET_VERSION if not rule_id.startswith("MC") else MATCHER_VERSION,
                    confidence=round(confidence, 2), severity=severity, owner=owner, status="pending", decisions=decisions,
                    reviewer_decision=None, downstream=downstream or {"invoices": [], "orders": [], "open_ar_usd": 0},
                    affected_count=affected_count if affected_count is not None else len(source_rids))
        if extra:
            item.update(extra)
        self.review.append(item)
        return item

    def downstream_for_orders(self, order_ids):
        inv = [r for r in self.rows["10"] if r["Reference_Sales_Order"] in set(order_ids)]
        return {"orders": sorted(set(order_ids)), "invoices": sorted(r["SAP_Billing_Document"] for r in inv),
                "open_invoices": sorted(r["SAP_Billing_Document"] for r in inv if (fnum(r["Open_Amount_USD"]) or 0) > 0),
                "open_ar_usd": round(sum(fnum(r["Open_Amount_USD"]) or 0 for r in inv), 2)}

    def orders_for_facility(self, gid, material=None):
        return [o["SAP_Sales_Order"] for o in self.rows["09"] if self.facility_of_account(o["Sold_To_No"]) == gid
                and (material is None or o["Material_Number"] == material)]

    def build_review_queue(self, sql: dict):
        R, F = self.rows, self.facilities
        NORM = ["Accept standard form", "Edit", "Reject"]
        IDM = ["Same entity", "Different entities", "Defer"]
        REL = ["Approve edge", "Pick alternative", "Request investigation"]
        UNR = ["Confirm value", "Leave unknown", "Assign follow-up"]
        self.item_for = defaultdict(list)  # (kind, key) -> review ids

        # identity: same-source duplicates
        for c in self.match_candidates:
            if c["status"] != "review":
                continue
            surv = next(x for x in self.match_candidates if x["native_id"] == c["survivor_native_id"])
            same = c["native_id"] != c["survivor_native_id"]
            contra = []
            if c["features"]["address_similarity"] is not None and c["features"]["address_similarity"] < 1:
                contra.append(f"street differs: '{c['address']}' vs '{surv['address']}'")
            st = c["row"].get("Record_Status")
            if st and st != "Active":
                contra.append(f"record status {st}")
            label = SRC[c["source"]]["label"]
            item = self.add_review(
                "identity", "facility", "same-entity candidate" if same else "facility match",
                f"{c['native_id']} looks like {c['survivor_native_id'] if same else self.fname(c['golden_facility_id'])}",
                f"Two records in {label} point at {self.fname(c['golden_facility_id'])}; a merge must be confirmed by a person." if same
                else f"Best facility match scored {c['score']:.2f}, below the auto-publish threshold {AUTO_THRESHOLD}.",
                [c["rid"], surv["rid"]] if same else [c["rid"]],
                {"record": c["native_id"], "name": c["name"], "address": c["address"]},
                {"merge_into": c["survivor_native_id"], "golden_facility_id": c["golden_facility_id"], "display_name": self.fname(c["golden_facility_id"])},
                [f"Name similarity {c['features']['name_similarity']:.2f} (distinctive tokens)",
                 f"Address similarity {c['features']['address_similarity'] if c['features']['address_similarity'] is not None else 'n/a'}",
                 f"Match score {c['score']:.2f}, margin over next facility {c['margin']:.2f}"] + [f"Contradiction: {x}" for x in contra],
                "MC-FACILITY", c["score"] - (0.05 if contra else 0), "high", SRC[c["source"]]["owner"], IDM,
                extra={"match_candidate_id": c["candidate_id"], "golden_facility_id": c["golden_facility_id"]})
            c["review_item"] = item["review_id"]
            self.item_for[("xwalk", c["native_id"])].append(item["review_id"])

        # identity: enterprise party in two ERPs with one native ID
        ent = self.enterprise["erp_rows"]
        if len(ent) > 1:
            item = self.add_review(
                "identity", "enterprise party", "same native ID in two ERPs",
                f"{ent[0]['ERP_Customer_ID']} exists in {' and '.join(r['ERP_System'] for r in ent)}",
                "The same customer number appears in two ERP systems with different names; confirm one enterprise party.",
                [r["_rid"] for r in ent], {r["ERP_System"]: r["Legal_Name"] for r in ent},
                {"golden_party": "GP-001", "display_name": self.enterprise["reltio"]["DBA_Name"] + " (" + self.enterprise["reltio"]["Legal_Name"] + ")"},
                [f"Identical address: {ent[0]['Address']}", f"Reltio enterprise parent {self.enterprise['reltio']['Reltio_Record_ID']} has the same address",
                 "Names differ only by the brand prefix 'Ascension'" if "ascension" in self.brand_tokens else "Names differ"],
                "U-02-NATIVE", 0.93, "medium", SRC["02"]["owner"], IDM)
            self.item_for[("party", "GP-001")].append(item["review_id"])

        # normalization: serial letter-O typos (grouped)
        serial_f = [f for f in self.findings if f["rule_id"] == "V-SERIAL"]
        if serial_f:
            orders = [self.by_rid[f["source_row_id"]]["SAP_Sales_Order"] for f in serial_f if f["source"] == "09"]
            assets = [self.by_rid[f["source_row_id"]]["Electronic_Asset_ID"] for f in serial_f if f["source"] == "06"]
            orders += [so for so, x in self.order_asset.items() if x["asset_id"] in assets]
            item = self.add_review(
                "normalization", "asset", "serial format", f"{len(serial_f)} serials use the letter O for zero",
                "Serials that fail the PREFIX-YYYY-NNNNNN pattern break exact joins between orders, scans and the install base.",
                [f["source_row_id"] for f in serial_f], [f["original_value"] for f in serial_f], [f["proposed_value"] for f in serial_f],
                [f"{f['native_key']}: {f['original_value']} -> {f['proposed_value']}" for f in serial_f], "V-SERIAL", 0.97, "high",
                "Install base / service operations", NORM, downstream=self.downstream_for_orders(orders),
                extra={"pairs": [{"rid": f["source_row_id"], "key": f["native_key"], "field": f["field"], "old": f["original_value"], "new": f["proposed_value"]} for f in serial_f]})
            for a in assets:
                self.item_for[("asset", a)].append(item["review_id"])
            for so in orders:
                self.item_for[("order", so)].append(item["review_id"])

        # normalization: facility name variants grouped per facility
        by_fac = defaultdict(list)
        for f in self.findings:
            if f["rule_id"] == "S-NAME":
                link = self.link_mention(f["original_value"])
                by_fac[link["candidate"]].append((f, link))
        for gid in sorted(by_fac):
            pairs = by_fac[gid]
            variants = Counter(f["original_value"] for f, _ in pairs)
            low = min(l["score"] for _, l in pairs)
            item = self.add_review(
                "normalization", "facility", "name variants",
                f"{len(variants)} non-standard spelling{'s' if len(variants) != 1 else ''} of {self.fname(gid)}",
                "Operational systems type the facility name freely; the standard display form is proposed and originals are kept.",
                sorted({f["source_row_id"] for f, _ in pairs}), sorted(variants), self.fname(gid),
                [f"'{v}' x{n} - similarity {self.link_mention(v)['score']:.2f}" for v, n in variants.most_common()],
                "S-NAME", low, "medium" if low < AUTO_THRESHOLD else "low", "Data governance (facility naming)", NORM,
                extra={"golden_facility_id": gid, "pairs": [{"rid": f["source_row_id"], "key": f["native_key"], "field": f["field"], "old": f["original_value"],
                                                             "new": self.fname(gid), "score": l["score"]} for f, l in pairs]})
            self.item_for[("facility", gid)].append(item["review_id"])

        # normalization: email typos
        ef = [f for f in self.findings if f["rule_id"] == "V-EMAIL"]
        if ef:
            self.add_review("normalization", "contact", "email domain", f"{len(ef)} contact emails use a misspelled domain",
                            "The host differs from the domain used by every other customer contact.",
                            [f["source_row_id"] for f in ef], [f["original_value"] for f in ef], [f["proposed_value"] for f in ef],
                            [f["evidence"] for f in ef], "V-EMAIL", 0.9, "medium", SRC["03"]["owner"], NORM,
                            extra={"pairs": [{"rid": f["source_row_id"], "key": f["native_key"], "field": f["field"], "old": f["original_value"], "new": f["proposed_value"]} for f in ef]})

        # normalization: AR status/amount disagreement
        af = [f for f in self.findings if f["rule_id"] == "V-AR-STATUS"]
        if af:
            invs = [self.by_rid[f["source_row_id"]]["SAP_Billing_Document"] for f in af]
            self.add_review("normalization", "invoice", "status / amount disagreement", f"{len(af)} invoices are 'Open' with nothing open",
                            "Clearing status says Open while the open amount is zero; exposure uses the amount and the status is flagged.",
                            [f["source_row_id"] for f in af], [f["original_value"] for f in af], "Cleared (confirm with AR)",
                            [f["evidence"] for f in af], "V-AR-STATUS", 0.8, "low", SRC["10"]["owner"], NORM,
                            downstream={"orders": [], "invoices": invs, "open_invoices": [], "open_ar_usd": 0},
                            extra={"pairs": [{"rid": f["source_row_id"], "key": f["native_key"], "field": "Clearing_Status", "old": "Open", "new": "Cleared"} for f in af]})

        # relationship: asset location conflicts
        for a in sorted(self.assets.values(), key=lambda x: x["asset_id"]):
            if a["location_status"] != "conflict":
                continue
            orders = [so for so in a["orders"]]
            ds = self.downstream_for_orders(orders)
            alt = [{"golden_facility_id": a["move_target"], "label": f"Move to {self.fname(a['move_target'])}"},
                   {"golden_facility_id": a["ib_facility"], "label": f"Keep install base site: {self.fname(a['ib_facility'])}"}]
            item = self.add_review(
                "relationship", "asset", "asset location",
                f"{a['asset_id']} ({a['serial']}): {self.fname(a['ib_facility'])} or {self.fname(a['move_target'])}?",
                "Movement and service evidence disagree with the install base site.",
                [a["rid"]] + [e["rid"] for e in a["timeline"] if e["type"] != "install_base"],
                {"install_base_site": self.fname(a["ib_facility"]), "confirmed": a["confirmed"]},
                {"proposed_site": self.fname(a["move_target"]), "golden_facility_id": a["move_target"],
                 "recommendation": "move" if a["location_confidence"] >= 0.5 else "investigate before moving"},
                a["location_evidence"] + [f"{len(orders)} order(s) reference this serial: {', '.join(orders) or 'none'}"],
                "F-ASSET-LOC", a["location_confidence"], "high" if ds["open_ar_usd"] else "medium",
                "Install base / service operations", REL if a["location_confidence"] >= 0.5 else ["Request investigation", "Approve edge", "Pick alternative"],
                downstream=ds, extra={"asset_id": a["asset_id"], "alternatives": alt, "timeline": a["timeline"]})
            self.item_for[("asset", a["asset_id"])].append(item["review_id"])
            for so in orders:
                self.item_for[("order", so)].append(item["review_id"])

        # relationship: entitlement problems grouped by contract
        by_ctr = defaultdict(list)
        for so, x in self.entitlement.items():
            if x["Contract_ID"] and x["entitlement_status"] != "covered":
                by_ctr[x["Contract_ID"]].append(so)
        for ctr, sos in sorted(by_ctr.items()):
            c = next(r for r in R["05"] if r["Contract_ID"] == ctr)
            x = self.entitlement[sos[0]]
            ds = self.downstream_for_orders(sos)
            item = self.add_review(
                "relationship", "contract", "entitlement", f"{len(sos)} orders billed against {ctr} ({c['Contract_Status']}, no end date)" if blank(c["Term_End_Date"]) else f"{len(sos)} orders outside {ctr} term",
                f"Orders for {x['Material_Number']} at {self.fname(x['golden_facility_id'])} map to a contract that is {c['Contract_Status']} with term end '{c['Term_End_Date'] or 'missing'}'.",
                [c["_rid"]] + [o["_rid"] for o in R["09"] if o["SAP_Sales_Order"] in sos],
                {"contract": ctr, "status": c["Contract_Status"], "term_end": c["Term_End_Date"] or None},
                "Confirm renewal / successor contract or stop billing", [f"{len(sos)} orders: {', '.join(sos)}",
                                                                         f"Contract term began {c['Term_Begin_Date']}; status {c['Contract_Status']}",
                                                                         f"Facility crosswalk: {c['Salesforce_Account_ID']} -> {x['golden_facility_id']}"],
                "B-ENTITLE-01", 0.9, "high", SRC["05"]["owner"], REL, downstream=ds, extra={"contract_id": ctr})
            for so in sos:
                self.item_for[("order", so)].append(item["review_id"])
            self.item_for[("contract", ctr)].append(item["review_id"])

        # relationship: orders booked in the wrong ERP
        sf = [f for f in self.findings if f["rule_id"] == "S-ORDER-SYS"]
        if sf:
            sos = [self.by_rid[f["source_row_id"]]["SAP_Sales_Order"] for f in sf]
            item = self.add_review("relationship", "order", "order system", f"{len(sf)} orders booked in JDE for an SAP-mastered account" if all(f['original_value'] == 'JDE_Legacy' for f in sf) else f"{len(sf)} orders booked in a different ERP",
                                   "The order's ERP client differs from the system that masters the sold-to account.",
                                   [f["source_row_id"] for f in sf], sorted({f["original_value"] for f in sf}), "Re-point to the account's master ERP or confirm dual booking",
                                   [f"{self.by_rid[f['source_row_id']]['SAP_Sales_Order']}: {f['evidence']}" for f in sf],
                                   "S-ORDER-SYS", 0.85, "medium", SRC["09"]["owner"], REL, downstream=self.downstream_for_orders(sos))
            for so in sos:
                self.item_for[("order", so)].append(item["review_id"])

        # relationship: hierarchy repairs (Reltio + ERP)
        rf = [f for f in self.findings if f["rule_id"] == "R-01-PARENT"]
        for f in rf:
            row = self.by_rid[f["source_row_id"]]
            sib = Counter(r["Hierarchy_Parent_Reltio_ID"] for r in R["01"] if r["Hierarchy_Level"] == "Facility" and r["_rid"] != row["_rid"] and not blank(r["Hierarchy_Parent_Reltio_ID"]))
            p, n = sib.most_common(1)[0]
            self.add_review("relationship", "facility", "hierarchy parent", f"{row['Reltio_Record_ID']} points at missing parent {f['original_value']}",
                            "The parent ID does not exist, so the facility drops out of the enterprise roll-up.",
                            [row["_rid"]], f["original_value"], p, [f"{n} of {sum(sib.values())} sibling facilities use {p}", f"{p} is the enterprise parent ({self.enterprise['reltio']['Legal_Name']})"],
                            "R-01-PARENT", 0.9, "high", SRC["01"]["owner"], REL)
        ef2 = [f for f in self.findings if f["rule_id"] in ("R-02-PARENT", "C-02-PARENT")]
        if ef2:
            ent_id = Counter(r["Parent_ERP_Customer_ID"] for r in R["02"] if r["Parent_ERP_Customer_ID"] and r["Parent_ERP_Customer_ID"] in {x["ERP_Customer_ID"] for x in R["02"]}).most_common(1)[0][0]
            self.add_review("relationship", "account", "hierarchy parent", f"{len(ef2)} ERP roles do not roll up to {ent_id}",
                            "One role points at a parent that is not in the extract and one has no parent at all.",
                            [f["source_row_id"] for f in ef2], [f"{self.by_rid[f['source_row_id']]['ERP_Customer_ID']}: {f['original_value'] or 'blank'}" for f in ef2], ent_id,
                            [f"All other roles in the same facility groups roll up to {ent_id}"], "R-02-PARENT", 0.92, "medium", SRC["02"]["owner"], REL)

        # relationship: collection notes alleging payer conflict without structural evidence
        notes = [r for r in R["10"] if (fnum(r["Open_Amount_USD"]) or 0) > 0 and "Payer relationship" in (r["Collection_Note"] or "")]
        if notes:
            ev = []
            for r in notes:
                p = self.pay[r["SAP_Billing_Document"]]
                ev.append(f"{r['SAP_Billing_Document']}: invoice payer {p['invoice_payer'] or 'blank'}, order payer {p['order_payer'] or 'blank'} ({p['payer_status']})")
            self.add_review("relationship", "invoice", "payer conflict (note only)", f"{len(notes)} open invoices noted as payer conflicts",
                            "Collections noted a payer conflict, but invoice and order payers agree in the extracts; the conflict cannot be corroborated here.",
                            [r["_rid"] for r in notes], "Payer relationship conflict (collection note)", "Request investigation with AR",
                            ev, "B-PAYER-01", 0.4, "medium", SRC["10"]["owner"], ["Request investigation", "Approve edge", "Pick alternative"],
                            downstream=self.downstream_for_orders([r["Reference_Sales_Order"] for r in notes]))

        # unresolved: owner ERP inference grouped by facility
        by_fac = defaultdict(list)
        for a in self.assets.values():
            if blank(a["owner_raw"]):
                by_fac[a["ib_facility"]].append(a)
        for gid in sorted(by_fac, key=lambda x: x or "zz"):
            assets = sorted(by_fac[gid], key=lambda x: x["asset_id"])
            if not gid:
                self.add_review("unresolved", "asset", "owner ERP number", f"{len(assets)} assets have no owner and no usable site",
                                "Neither site name, site address nor owner identifies a facility.", [a["rid"] for a in assets], "", None,
                                ["No evidence available"], "C-06-OWNER", 0.0, "high", SRC["06"]["owner"], UNR)
                continue
            f = F[gid]
            corroborated = [a for a in assets if any(self.rows_by_so()[so]["Sold_To_No"] == f["sold_to"] for so in a["orders"])]
            weak = [a for a in assets if a["site_link"]["band"] == "review"]
            moved = [a for a in assets if a["location_status"] == "conflict"]
            conf = 0.85 + 0.1 * (len(corroborated) / len(assets)) - 0.1 * (len(weak) / len(assets)) - 0.15 * (len(moved) / len(assets))
            item = self.add_review(
                "unresolved", "asset", "owner ERP number", f"Assign {f['sold_to']} as owner of {len(assets)} asset{'s' if len(assets) != 1 else ''} at {self.fname(gid)}",
                "Owner ERP number is blank; the facility's sold-to account is inferred from site evidence.",
                [a["rid"] for a in assets], "", f["sold_to"],
                [f"Site evidence links all {len(assets)} assets to {self.fname(gid)} ({', '.join(sorted({a['ib_basis'] for a in assets if a['ib_basis']}))})",
                 f"{len(corroborated)} of {len(assets)} also have orders sold to {f['sold_to']}",
                 f"{f['sold_to']} carries the SOLD_TO role for this facility in {', '.join(f['erp_systems'])}"]
                + ([f"{len(moved)} asset(s) have an open location question: {', '.join(a['asset_id'] for a in moved)}"] if moved else []),
                "C-06-OWNER", min(conf, 0.95), "high", SRC["06"]["owner"], UNR, affected_count=len(assets),
                extra={"golden_facility_id": gid, "assets": [a["asset_id"] for a in assets]})
            for a in assets:
                self.item_for[("asset", a["asset_id"])].append(item["review_id"])

        # unresolved: contracts without an account
        ctr_rows = sql["q_contract_account"]
        linked = defaultdict(set)
        xw = self.xwalk_index()
        for x in ctr_rows:
            if x["join_status"] == "native_match":
                linked[xw.get(("sf_accounts", x["Salesforce_Account_ID"]))].add(x["covered_material"])
        ordered = [c["Contract_ID"] for c in R["05"]]
        for x in ctr_rows:
            if x["join_status"] != "unresolved_missing_key":
                continue
            mat = x["covered_material"]
            cands = [gid for gid in F if mat not in linked[gid] and self.orders_for_facility(gid, mat)]
            i = ordered.index(x["Contract_ID"])
            neighbours = []
            for j in (i - 1, i + 1):
                if 0 <= j < len(ordered):
                    nx = next(y for y in ctr_rows if y["Contract_ID"] == ordered[j])
                    neighbours.append((ordered[j], xw.get(("sf_accounts", nx["Salesforce_Account_ID"]))))
            pick = next((g for _, g in neighbours if g in cands), cands[0] if len(cands) == 1 else None)
            sf_id = next((xx["native_id"] for xx in F[pick]["crosswalk"] if xx["table"] == "sf_accounts" and xx["status"] in ("auto", "native")), None) if pick else None
            ev = [f"Facilities with {mat} orders but no linked {mat} contract: {', '.join(self.fname(g) for g in cands) or 'none'}",
                  "Adjacent contract IDs belong to: " + ", ".join(f"{cid} -> {self.fname(g)}" for cid, g in neighbours)]
            conf = 0.72 if pick and len(cands) > 1 else 0.85 if pick else 0.2
            item = self.add_review("unresolved", "contract", "contract account", f"{x['Contract_ID']} ({x['Pricing_Schedule_by_Transaction_Type']}) has no account",
                                   "The contract cannot be tied to a facility, so its orders show no entitlement.",
                                   [x["contract_rid"]], "", sf_id, ev, "C-05-ACCT", conf, "high", SRC["05"]["owner"], UNR,
                                   downstream=self.downstream_for_orders(self.orders_for_facility(pick, mat)) if pick else None,
                                   extra={"contract_id": x["Contract_ID"], "golden_facility_id": pick})
            self.item_for[("contract", x["Contract_ID"])].append(item["review_id"])

        # unresolved: contacts without an account (phone-block siblings)
        for x in sql["q_contact_account"]:
            if x["join_status"] != "unresolved_missing_key":
                continue
            row = self.by_rid[x["contact_rid"]]
            prefix = row["Phone_Number"][:-1] if not blank(row["Phone_Number"]) else None
            sibs = [r for r in R["03"] if prefix and r["_rid"] != row["_rid"] and r["Phone_Number"].startswith(prefix) and not blank(r["Salesforce_Account_ID"])]
            accts = Counter(r["Salesforce_Account_ID"] for r in sibs)
            pick = accts.most_common(1)[0][0] if len(accts) == 1 else None
            self.add_review("unresolved", "contact", "contact account", f"Contact {row['Universal_Contact_ID'][-4:]} ({row['BD_Contact_Type']}) has no account",
                            "A contact without an account cannot be routed to a facility.", [row["_rid"]], "", pick,
                            [f"Phone {row['Phone_Number']} shares the block {prefix}x with {len(sibs)} contacts, all on {pick}" if pick else "No sibling evidence",
                             f"Email domain {row['Business_Email'].split('@')[-1] if row['Business_Email'] else 'n/a'}"],
                            "C-03-ACCT", 0.75 if pick else 0.1, "medium", SRC["03"]["owner"], UNR)

        # unresolved: invoices / orders missing payer
        miss = [p for p in self.pay.values() if p["payer_status"] in ("invoice_missing", "both_missing")]
        if miss:
            props, ev = [], []
            for p in miss:
                o = self.rows_by_so()[p["Reference_Sales_Order"]]
                if p["order_payer"]:
                    props.append(p["order_payer"])
                    ev.append(f"{p['SAP_Billing_Document']}: take order payer {p['order_payer']}")
                else:
                    gid = self.facility_of_account(o["Sold_To_No"])
                    props.append(F[gid]["payer"] if gid else None)
                    ev.append(f"{p['SAP_Billing_Document']}: order payer also blank; facility PAYER role {F[gid]['payer'] if gid else 'unknown'}")
            self.add_review("unresolved", "invoice", "invoice payer", f"{len(miss)} invoices have no payer account",
                            "Collections cannot be routed without a payer; the order or the facility's payer role is proposed.",
                            [p["invoice_rid"] for p in miss], "", props, ev, "C-10-PAYER", 0.88, "high", SRC["10"]["owner"], UNR,
                            downstream=self.downstream_for_orders([p["Reference_Sales_Order"] for p in miss]),
                            extra={"pairs": [{"rid": p["invoice_rid"], "key": p["SAP_Billing_Document"], "field": "Payer_Account_No", "old": "", "new": v} for p, v in zip(miss, props)]})

        # unresolved: movements with no destination, service visits with no identifiers
        md = [f for f in self.findings if f["rule_id"] == "C-07-DEST"]
        if md:
            props = []
            for f in md:
                x = self.asset_resolution.get(("07", f["source_row_id"]))
                a = self.assets.get(x["asset_id"]) if x else None
                props.append(a["site_name"] if a else None)
            self.add_review("unresolved", "movement", "movement destination", f"{len(md)} install events have no destination",
                            "An install with no destination cannot place the asset; the install base site is proposed.",
                            [f["source_row_id"] for f in md], "", props, [f"{f['native_key']} -> {p}" for f, p in zip(md, props)],
                            "C-07-DEST", 0.85, "low", SRC["07"]["owner"], UNR)
        sv = [f for f in self.findings if f["rule_id"] == "C-08-IDS"]
        if sv:
            self.add_review("unresolved", "service event", "service device", f"{len(sv)} service visits name no device",
                            "No asset tag or serial was captured; the visit cannot be tied to an asset. Inference is not attempted.",
                            [f["source_row_id"] for f in sv], "", None,
                            [f"{f['native_key']} at {self.by_rid[f['source_row_id']]['Customer_Site_Entered'] or 'unknown site'}" for f in sv],
                            "C-08-IDS", 0.0, "medium", SRC["08"]["owner"], ["Assign follow-up", "Leave unknown", "Confirm value"])

        # unresolved: DHC ID available from a duplicate profile
        for c in self.match_candidates:
            if c["source"] != "01" or c["status"] != "review" or blank(c["row"].get("Definitive_Healthcare_ID")):
                continue
            surv = next(x for x in self.match_candidates if x["native_id"] == c["survivor_native_id"])
            if blank(surv["row"]["Definitive_Healthcare_ID"]):
                self.add_review("unresolved", "facility", "healthcare ID", f"{surv['native_id']} is missing its Definitive Healthcare ID",
                                f"The duplicate candidate {c['native_id']} carries one; it applies only if the merge is approved.",
                                [surv["rid"], c["rid"]], "", c["row"]["Definitive_Healthcare_ID"],
                                [f"{c['native_id']} has {c['row']['Definitive_Healthcare_ID']}", f"Depends on {c.get('review_item')}"],
                                "C-01-DHC", 0.7, "medium", SRC["01"]["owner"], UNR, extra={"depends_on": c.get("review_item")})

    def rows_by_so(self):
        if not hasattr(self, "_so"):
            self._so = {r["SAP_Sales_Order"]: r for r in self.rows["09"]}
        return self._so

    def xwalk_index(self):
        out = {}
        for gid, f in self.facilities.items():
            for x in f["crosswalk"]:
                if x["status"] in ("native", "auto"):
                    out[(x["table"], x["native_id"])] = gid
        return out

    def extend_crosswalk(self):
        for c in self.match_candidates:
            if c["status"] == "no_match":
                continue
            table = "reltio" if c["source"] == "01" else "sf_accounts"
            self.facilities[c["golden_facility_id"]]["crosswalk"].append(dict(
                source=c["source"], table=table, native_id=c["native_id"], rid=c["rid"], system=SRC[c["source"]]["system"],
                role=None, name=c["name"], address=c["address"], status=c["status"], score=c["score"], method=c["method"], review_item=None))

    # ── stage 8: AR exposure ──────────────────────────────────────────────
    def ar_exposure(self, sql: dict):
        R = self.rows
        open_ar = {x["SAP_Billing_Document"]: x for x in sql["q_open_ar_aging"]}
        cats_order = ["asset_relationship", "entitlement", "system_mismatch", "identifier_defect", "payer_gap", "missing_link", "note_only"]
        labels = {
            "asset_relationship": "Asset moved / billed to prior facility",
            "entitlement": "Billed on expired or open-ended contract",
            "system_mismatch": "Order booked in a different ERP",
            "identifier_defect": "Serial fixable only by normalization",
            "payer_gap": "Payer missing on invoice",
            "missing_link": "Note claims an asset issue but the order carries no serial",
            "note_only": "Collection note not corroborated by the extracts",
        }
        structural = {"asset_relationship", "entitlement", "system_mismatch", "identifier_defect", "payer_gap"}
        inv_rows = []
        for r in R["10"]:
            amt = fnum(r["Open_Amount_USD"]) or 0
            so = r["Reference_Sales_Order"]
            o = self.rows_by_so().get(so)
            cats, evidence = [], []
            oa = self.order_asset.get(so)
            if oa and oa["status"] != "consistent":
                cats.append("asset_relationship")
                evidence.append(f"{oa['asset_id']}: {oa['status'].replace('_', ' ')} (order facility {self.fname(oa['order_facility'])}, asset now {self.fname(oa['asset_proposed_facility'])})")
            ent = self.entitlement.get(so)
            if ent and ent["Contract_ID"] and ent["entitlement_status"] != "covered":
                cats.append("entitlement")
                evidence.append(f"{ent['Contract_ID']} {ent['Contract_Status']}, term end {ent['term_end'] or 'missing'}")
            if o and any(f["rule_id"] == "S-ORDER-SYS" and f["source_row_id"] == o["_rid"] for f in self.findings):
                cats.append("system_mismatch")
                evidence.append(f"order booked in {o['SAP_Client']}")
            if o and any(f["rule_id"] == "V-SERIAL" and f["source_row_id"] == o["_rid"] for f in self.findings) or \
                    (oa and any(f["rule_id"] == "V-SERIAL" and f["native_key"] == oa["asset_id"] for f in self.findings)):
                cats.append("identifier_defect")
                evidence.append("serial links order and asset only after normalization")
            p = self.pay.get(r["SAP_Billing_Document"])
            if p and p["payer_status"] in ("invoice_missing", "both_missing"):
                cats.append("payer_gap")
                evidence.append(f"payer blank on invoice ({p['payer_status'].replace('_', ' ')})")
            note = r["Collection_Note"] or ""
            if note and not (set(cats) & structural):
                if "Asset moved" in note and o and blank(o["Equipment_Serial"]):
                    cats.append("missing_link")
                    evidence.append("note says the asset moved but the order has no Equipment_Serial")
                else:
                    cats.append("note_only")
                    evidence.append(f"note: {note}")
            primary = next((c for c in cats_order if c in cats), None)
            review_ids = sorted({rid for key in (("order", so),) for rid in self.item_for.get(key, [])}
                                | ({rid for rid in self.item_for.get(("asset", oa["asset_id"]), [])} if oa else set()))
            inv_rows.append(dict(
                invoice=r["SAP_Billing_Document"], rid=r["_rid"], order=so, order_rid=o["_rid"] if o else None,
                facility=self.facility_of_account(o["Sold_To_No"]) if o else None, facility_name=self.fname(self.facility_of_account(o["Sold_To_No"])) if o else None,
                material=o["Material_Number"] if o else None, order_type=o["Order_Type"] if o else None, serial=o["Equipment_Serial"] if o else None,
                asset_id=oa["asset_id"] if oa else None, payer=r["Payer_Account_No"] or None, billing_date=r["Billing_Date"],
                net_due_date=r["Net_Due_Date"], billed_usd=fnum(r["Billing_Amount_USD"]), open_usd=amt, status=r["Clearing_Status"],
                aging_bucket=open_ar[r["SAP_Billing_Document"]]["aging_bucket"] if r["SAP_Billing_Document"] in open_ar else None,
                days_past_due=open_ar[r["SAP_Billing_Document"]]["days_past_due"] if r["SAP_Billing_Document"] in open_ar else None,
                collection_note=note or None, categories=cats, primary_category=primary,
                association="structural" if primary in structural else primary or "none", evidence=evidence, review_items=review_ids))
        open_rows = [x for x in inv_rows if x["open_usd"] > 0]
        total_open = sum(x["open_usd"] for x in open_rows)
        assoc = [x for x in open_rows if x["association"] == "structural"]
        by_cat = []
        for c in cats_order:
            rows = [x for x in open_rows if x["primary_category"] == c]
            any_rows = [x for x in open_rows if c in x["categories"]]
            by_cat.append(dict(category=c, label=labels[c], structural=c in structural, invoices_primary=len(rows),
                               open_usd_primary=sum(x["open_usd"] for x in rows), invoices_any=len(any_rows), open_usd_any=sum(x["open_usd"] for x in any_rows)))
        buckets = ["Current", "1-30", "31-60", "61-90", "90+"]
        aging = [dict(bucket=b, invoices=len([x for x in open_rows if x["aging_bucket"] == b]), open_usd=sum(x["open_usd"] for x in open_rows if x["aging_bucket"] == b),
                      associated_usd=sum(x["open_usd"] for x in assoc if x["aging_bucket"] == b)) for b in buckets]
        by_fac = []
        for gid in self.facilities:
            rows = [x for x in open_rows if x["facility"] == gid]
            by_fac.append(dict(golden_facility_id=gid, name=self.fname(gid), open_invoices=len(rows), open_usd=sum(x["open_usd"] for x in rows),
                               associated_invoices=len([x for x in rows if x["association"] == "structural"]),
                               associated_usd=sum(x["open_usd"] for x in rows if x["association"] == "structural")))
        exclusions = [dict(invoice=x["invoice"], reason=f"status {x['status']} but open amount 0") for x in inv_rows if x["status"] == "Open" and x["open_usd"] == 0]
        return dict(
            as_of=self.as_of.isoformat(),
            count_logic="One row per SAP_Billing_Document. Open AR = sum of Open_Amount_USD over distinct invoices with Open_Amount_USD > 0. "
                        "An invoice touching several issues is counted once under its highest-precedence category.",
            category_precedence=cats_order, category_labels=labels,
            totals=dict(invoices=len(inv_rows), open_invoices=len(open_rows), open_usd=total_open,
                        associated_invoices=len(assoc), associated_usd=sum(x["open_usd"] for x in assoc),
                        missing_link_usd=sum(x["open_usd"] for x in open_rows if x["association"] == "missing_link"),
                        note_only_usd=sum(x["open_usd"] for x in open_rows if x["association"] == "note_only"),
                        no_issue_usd=sum(x["open_usd"] for x in open_rows if x["association"] == "none")),
            by_category=by_cat, aging=aging, by_facility=by_fac, exclusions=exclusions, invoices=inv_rows,
            caveat="Open AR associated with an identified issue - not an amount recoverable or a proven loss.",
        )


# ─────────────────────────────────────────────────────────────────────────────
#  Assemble outputs
# ─────────────────────────────────────────────────────────────────────────────
CANONICAL_ENTITIES = [
    ("party", "Party / Customer", "One enterprise customer", ["Reltio_Record_ID", "ERP_Customer_ID (PARENT)"],
     [("party_id", "id", "Golden party ID"), ("legal_name", "text", "Survivor legal name"), ("dba_name", "text", "Doing-business-as"),
      ("hq_address", "address", "Headquarters address"), ("payment_terms", "category", "Default terms"), ("source_refs", "crosswalk", "Native IDs per system")]),
    ("facility", "Facility / Site", "One care site", ["Reltio_Record_ID", "ERP_Customer_ID group", "Salesforce_Account_ID"],
     [("facility_id", "id", "Golden facility ID"), ("display_name", "text", "Standard display name"), ("address", "address", "Ranked address"),
      ("dhc_id", "id", "Definitive Healthcare ID"), ("parent_party_id", "id", "Enterprise roll-up"), ("source_refs", "crosswalk", "Native IDs per system")]),
    ("account_role", "Account role", "One ERP account playing a role for a facility", ["ERP_System + ERP_Customer_ID"],
     [("role", "category", "SOLD_TO / SHIP_TO / BILL_TO / PAYER / PARENT"), ("erp_account", "id", "Native account"), ("facility_id", "id", "Facility")]),
    ("contact", "Contact", "One person in a role at a facility", ["Universal_Contact_ID"],
     [("contact_id", "id", "Native contact ID"), ("contact_type", "category", "Role"), ("facility_id", "id", "Facility via account"), ("email", "text", "Validated email")]),
    ("contract", "Contract", "One transactional contract", ["Contract_ID"],
     [("contract_id", "id", "Native ID"), ("facility_id", "id", "Facility via account"), ("covered_material", "id", "Material covered"),
      ("term", "date range", "Begin / end"), ("status", "category", "Status"), ("po_required", "flag", "PO required")]),
    ("asset", "Equipment asset", "One installed device", ["Electronic_Asset_ID", "Serial_Number", "Unique_Device_Identifier"],
     [("asset_id", "id", "Electronic asset ID"), ("serial", "id", "Normalized serial"), ("current_site", "facility ref", "Time-aware proposed facility"),
      ("owner_account", "id", "Owner ERP account"), ("warranty_end", "date", "Warranty end")]),
    ("movement", "Movement", "One install or move event", ["Transfer_Event_No"],
     [("event_id", "id", "Native ID"), ("asset_id", "id", "Resolved asset"), ("destination_facility", "facility ref", "Destination"), ("valid_from", "date", "Event date")]),
    ("service_event", "Service event", "One service visit", ["Service_Work_Order"],
     [("work_order", "id", "Native ID"), ("asset_id", "id", "Resolved asset"), ("facility_id", "facility ref", "Visit site"), ("visit_date", "date", "Date")]),
    ("sales_order", "Sales order", "One order line", ["SAP_Sales_Order"],
     [("order_id", "id", "Native ID"), ("facility_id", "facility ref", "Via sold-to"), ("asset_id", "id", "Via serial"), ("roles", "relationship", "Sold/ship/bill/payer"), ("net_value", "money", "USD")]),
    ("invoice", "Invoice / receivable", "One invoice", ["SAP_Billing_Document"],
     [("invoice_id", "id", "Native ID"), ("order_id", "id", "Reference order"), ("payer", "id", "Resolved payer"), ("open_amount", "money", "Open USD"), ("aging_bucket", "category", "Aging")]),
]


def build_mappings(run: Run, sql: dict) -> list[dict]:
    R = run.rows
    res = run.asset_resolution
    n_ord_serial = len([r for r in R["09"] if not blank(r["Equipment_Serial"])])
    ord_resolved = len([1 for (s, _), x in res.items() if s == "09" and x["candidate_assets"] == 1])
    ord_raw = len([1 for (s, _), x in res.items() if s == "09" and x["candidate_assets"] == 1 and x["matched_without_normalization"]])
    mv_with = len([1 for (s, _), x in res.items() if s == "07"])
    mv_resolved = len([1 for (s, _), x in res.items() if s == "07" and x["candidate_assets"] == 1])
    mv_raw = len([1 for (s, _), x in res.items() if s == "07" and x["candidate_assets"] == 1 and x["matched_without_normalization"]])
    sv_with = len([1 for (s, _), x in res.items() if s == "08"])
    sv_resolved = len([1 for (s, _), x in res.items() if s == "08" and x["candidate_assets"] == 1])
    inv = sql["q_invoice_order_join"]
    inv_found = len([x for x in inv if x["order_found"]])
    ctr = sql["q_contract_account"]
    ctr_ok = len([x for x in ctr if x["join_status"] == "native_match"])
    con = sql["q_contact_account"]
    con_ok = len([x for x in con if x["join_status"] == "native_match"])
    pay = sql["q_invoice_payer_consistency"]
    pay_cons = len([x for x in pay if x["payer_status"] == "consistent"])
    pay_both = len([x for x in pay if x["payer_status"] in ("consistent", "conflict")])
    mc = run.match_candidates
    auto = [c for c in mc if c["status"] == "auto"]
    rev = [c for c in mc if c["status"] == "review"]
    assets = run.assets.values()
    owners_raw = len([a for a in assets if not blank(a["owner_raw"])])
    loc_conf = len([a for a in assets if a["location_status"] == "conflict"])
    names = run.mentions
    names_auto = len([m for m in names if m[3]["band"] == "auto"])

    def ex(rule):
        return len([f for f in run.findings if f["rule_id"] == rule])

    def samples_serial():
        out = []
        for f in run.findings:
            if f["rule_id"] == "V-SERIAL":
                out.append({"before": f["original_value"], "after": f["proposed_value"], "source": f["source_row_id"]})
        return out[:3]

    def samples_names():
        out = []
        seen = set()
        for code, field, r, link in names:
            if r[field] in seen or link["band"] == "auto" and std_text(r[field]) == std_text(run.fname(link["candidate"])):
                continue
            seen.add(r[field])
            out.append({"before": r[field], "after": run.fname(link["candidate"]), "source": r["_rid"], "score": link["score"]})
        return sorted(out, key=lambda x: x["score"])[:4]

    m = [
        dict(field="facility.display_name", entity="facility", method="fuzzy + survivorship",
             sources=["01.Legal_Name", "01.DBA_Name", "04.Account_Name", "02.Legal_Name", "08.Customer_Site_Entered", "06.Site_Name", "07.Destination_Location"],
             transform=["Lower-case, strip punctuation, 'St.' -> 'St'", "Drop tokens shared by most facility names (brand, saint, hospital words)",
                        "Jaro-Winkler on remaining distinctive tokens; near-miss common tokens ('Vincnt') ignored",
                        "Display form = Reltio DBA of the auto-matched profile, else most frequent ERP name"],
             join="name similarity >= 0.95 (auto) / 0.75-0.95 (review); name alone never confirms a cross-system join",
             confidence=round(names_auto / len(names), 3), coverage=f"{names_auto} / {len(names)} typed names auto-standardized",
             exceptions=ex("S-NAME"), exception_rule="S-NAME", sql_file=None, samples=samples_names(),
             rationale="Names vary by brand prefix, abbreviations and typos; standardize for display and propose linkage while preserving originals."),
        dict(field="facility.address", entity="facility", method="ranked evidence",
             sources=["01.Hierarchy_Account_Address", "02.Address", "04.Billing_Street + Billing_City", "06.Site_Address"],
             transform=["Parse number / street / city / state / zip", "Standardize street suffixes (Drive -> Dr)",
                        "Rank: Reltio > ERP > Salesforce > install base; keep competing values"],
             join="number + (zip or city) equal; street similarity scored", confidence=round(1 - ex("S-ADDR") / max(len([c for c in mc if c['features']['address_similarity'] is not None]), 1), 3),
             coverage=f"{len([c for c in mc if c['features']['address_similarity'] is not None])} matched records carried a comparable address",
             exceptions=ex("S-ADDR"), exception_rule="S-ADDR", sql_file=None,
             samples=[{"before": f["original_value"], "after": f["proposed_value"], "source": f["source_row_id"]} for f in run.findings if f["rule_id"] == "S-ADDR"][:3],
             rationale="Address corroborates a facility match; competing values are retained with rank, not overwritten."),
        dict(field="customer.source_refs", entity="facility", method="generated crosswalk",
             sources=["01.Reltio_Record_ID", "02.ERP_Customer_ID", "04.Salesforce_Account_ID"],
             transform=["ERP roles grouped by native structure ERP-<facility>-<role>", "Reltio facilities and Salesforce accounts scored against each ERP facility",
                        "Same-source duplicates always go to review; one survivor per source"],
             join=f"score >= {AUTO_THRESHOLD} auto-publish, {REVIEW_THRESHOLD}-{AUTO_THRESHOLD} review",
             confidence=round(sum(c["score"] for c in auto) / max(len(auto), 1), 3), coverage=f"{len(auto)} auto, {len(rev)} in review of {len(mc)} candidates",
             exceptions=len(rev), exception_rule="U-DUP-ENTITY", sql_file=None,
             samples=[{"before": f"{c['native_id']} ({c['name']})", "after": f"{c['golden_facility_id']} {run.fname(c['golden_facility_id'])}", "source": c["rid"], "score": c["score"]} for c in mc][:4],
             rationale="The crosswalk is generated from evidence, not assumed to pre-exist."),
        dict(field="account_role.relationship", entity="account_role", method="native exact",
             sources=["09.Sold_To_No", "09.Ship_To_No", "09.Bill_To_No", "09.Payer_No", "02.ERP_Customer_ID", "02.Account_Role"],
             transform=["Unpivot order roles", "Join to ERP accounts on ERP_Customer_ID", "Check the account carries the role and the order's ERP matches"],
             join='orders."Sold_To_No" = sap_accounts."ERP_Customer_ID" (per role)',
             confidence=round(len([x for x in sql["q_order_account_roles"] if x["account_found"] and x["role_matches"]]) / max(len([x for x in sql["q_order_account_roles"] if x["account_no"]]), 1), 3),
             coverage=f"{len([x for x in sql['q_order_account_roles'] if x['account_found']])} / {len(sql['q_order_account_roles'])} role references resolve",
             exceptions=ex("S-ORDER-SYS") + ex("S-ORDER-ROLE") + ex("C-09-PAYER") + ex("C-09-SHIPTO"), exception_rule="S-ORDER-SYS",
             sql_file="04_order_account_roles.sql", samples=[], rationale="Roles are modeled as relationships, never interchangeable customer fields."),
        dict(field="asset.identity", entity="asset", method="staged identifier index",
             sources=["06.Electronic_Asset_ID", "06.Serial_Number", "06.Alternate_Asset_ID", "06.Unique_Device_Identifier", "07.Asset_Tag", "07.Scanned_Serial",
                      "08.Equipment_Tag", "08.Observed_Serial", "09.Equipment_Serial"],
             transform=["Build (source, row, id_type, normalized_value), excluding blanks", "Serial: upper-case, letter O -> 0 after the prefix",
                        "Match strong IDs only; >1 asset returned = conflict"],
             join="identifier_index.normalized_value = install-base normalized_value per id_type",
             confidence=round((mv_resolved + sv_resolved + ord_resolved) / max(mv_with + sv_with + n_ord_serial, 1), 3),
             coverage=f"movements {mv_resolved}/{len(R['07'])}, service {sv_resolved}/{len(R['08'])}, order serials {ord_resolved}/{n_ord_serial}",
             exceptions=ex("R-07-ASSET") + ex("R-08-ASSET") + ex("R-09-ASSET") + ex("C-08-IDS"), exception_rule="V-SERIAL",
             sql_file="03_asset_resolution.sql", samples=samples_serial(),
             rationale=f"Without normalization {mv_raw + ord_raw} of {mv_resolved + ord_resolved} movement/order references resolve; never join all-null identifiers."),
        dict(field="asset.current_site", entity="asset", method="time-aware evidence",
             sources=["06.Site_Name", "06.Site_Address", "06.Equipment_Confirmation_Date", "07.Destination_Location", "07.Movement_Date", "07.Event_Source", "08.Customer_Site_Entered", "08.Visit_Date"],
             transform=["Order evidence by date", "Last relocation proposes the site; base confidence by source (customer notice / service call 0.75, sales note 0.55)",
                        "+0.15 later service at new site, -0.20 install base re-confirmed old site after the move"],
             join="asset timeline (07_asset_event_timeline.sql) + facility name linking", confidence=round(1 - loc_conf / len(run.assets), 3),
             coverage=f"{len(run.assets) - loc_conf} / {len(run.assets)} assets have consistent location evidence",
             exceptions=loc_conf, exception_rule="F-ASSET-LOC", sql_file="07_asset_event_timeline.sql",
             samples=[{"before": a["site_name"], "after": run.fname(a["proposed_facility"]), "source": a["rid"], "score": a["location_confidence"]} for a in assets if a["location_status"] == "conflict"][:3],
             rationale="The latest service note is evidence, not truth."),
        dict(field="asset.owner_account", entity="asset", method="native + inferred",
             sources=["06.Owning_ERP_Customer_No", "06.Site_Name", "09.Sold_To_No"],
             transform=["Keep native owner where present", "Else infer the facility's SOLD_TO account from site evidence", "Corroborate with orders that reference the serial"],
             join="facility crosswalk -> ERP SOLD_TO role", confidence=round(owners_raw / len(run.assets), 3),
             coverage=f"{owners_raw} / {len(run.assets)} assets carry an owner; {len(run.assets) - owners_raw} proposed for review",
             exceptions=len(run.assets) - owners_raw, exception_rule="C-06-OWNER", sql_file=None, samples=[],
             rationale="Inference is proposed per facility group and needs confirmation."),
        dict(field="contract.account", entity="contract", method="native exact",
             sources=["05.Salesforce_Account_ID", "04.Salesforce_Account_ID"], transform=["Exact join", "Missing account stays unresolved; candidates proposed in review"],
             join='sf_contracts."Salesforce_Account_ID" = sf_accounts."Salesforce_Account_ID"', confidence=round(ctr_ok / len(ctr), 3),
             coverage=f"{ctr_ok} / {len(ctr)} contracts join", exceptions=len(ctr) - ctr_ok, exception_rule="C-05-ACCT", sql_file="06_contract_account.sql", samples=[],
             rationale="Native exact join where present."),
        dict(field="contact.account", entity="contact", method="native exact",
             sources=["03.Salesforce_Account_ID", "04.Salesforce_Account_ID"], transform=["Exact join", "IDs outside the extract are flagged (internal users)"],
             join='sf_contacts."Salesforce_Account_ID" = sf_accounts."Salesforce_Account_ID"', confidence=round(con_ok / len(con), 3),
             coverage=f"{con_ok} / {len(con)} contacts join", exceptions=len(con) - con_ok, exception_rule="C-03-ACCT", sql_file="08_contact_account.sql", samples=[],
             rationale="Native exact join where present."),
        dict(field="order.entitlement", entity="sales_order", method="crosswalk join",
             sources=["09.Sold_To_No", "09.Material_Number", "05.Pricing_Schedule_by_Transaction_Type", "05.Contract_Status", "05.Term_End_Date"],
             transform=["Sold-to -> golden facility via published crosswalk", "Contract -> golden facility via Salesforce account", "Match on covered material; test status and term"],
             join="xwalk(sold_to).facility = xwalk(contract account).facility AND covered_material = Material_Number",
             confidence=round(len([x for x in sql["q_order_entitlement"] if x["entitlement_status"] == "covered"]) / len(R["09"]), 3),
             coverage=f"{len([x for x in sql['q_order_entitlement'] if x['Contract_ID']])} / {len(R['09'])} orders reach a contract",
             exceptions=ex("B-ENTITLE-01"), exception_rule="B-ENTITLE-01", sql_file="09_order_entitlement.sql", samples=[],
             rationale="Only published crosswalk rows are used; unresolved contracts leave orders without entitlement."),
        dict(field="invoice.order", entity="invoice", method="native exact",
             sources=["10.Reference_Sales_Order", "09.SAP_Sales_Order"], transform=["Exact join on the order number"],
             join='billing."Reference_Sales_Order" = orders."SAP_Sales_Order"', confidence=round(inv_found / len(inv), 3),
             coverage=f"{inv_found} / {len(inv)} invoices join", exceptions=len(inv) - inv_found, exception_rule="J-INV-ORD", sql_file="01_invoice_order_join.sql", samples=[],
             rationale="High-confidence native transactional join; payer roles are not merged."),
        dict(field="invoice.payer", entity="invoice", method="native compare + resolve",
             sources=["10.Payer_Account_No", "09.Payer_No", "02.ERP_Customer_ID"], transform=["Compare invoice and order payer", "Resolve to the ERP payer account", "Flag payment blocks"],
             join='coalesce(billing."Payer_Account_No", orders."Payer_No") = sap_accounts."ERP_Customer_ID"',
             confidence=round(pay_cons / max(pay_both, 1), 3), coverage=f"{pay_cons} / {pay_both} comparable invoices agree; {len(pay) - pay_both} have a blank payer",
             exceptions=len(pay) - pay_both, exception_rule="C-10-PAYER", sql_file="05_invoice_payer_consistency.sql", samples=[],
             rationale="Payer consistency is checked before resolving to an enterprise party."),
        dict(field="invoice.aging", entity="invoice", method="derived",
             sources=["10.Open_Amount_USD", "10.Net_Due_Date"], transform=["Open amount > 0", "Days past due vs run as-of date", "Buckets Current / 1-30 / 31-60 / 61-90 / 90+"],
             join="n/a (invoice grain)", confidence=1.0, coverage=f"{len(sql['q_open_ar_aging'])} open invoices",
             exceptions=ex("V-AR-STATUS"), exception_rule="V-AR-STATUS", sql_file="10_open_ar_aging.sql", samples=[],
             rationale="Invoice-level measures only; never summed across exception rows."),
    ]
    for i, x in enumerate(m, 1):
        x["mapping_id"] = f"MAP-{i:02d}"
        x["status"] = "proposed"
    return m


def build_er_graph(run: Run, sql: dict) -> dict:
    R = run.rows
    pos = {"01": (110, 90), "02": (420, 90), "04": (730, 90), "03": (1010, 40), "05": (1010, 190),
           "06": (300, 330), "07": (90, 470), "08": (420, 520), "09": (730, 380), "10": (1010, 380)}
    nodes = [dict(id=s["code"], table=s["table"], label=s["label"], system=s["system"], grain=s["grain"], key=s["key"],
                  records=len(R[s["code"]]), x=pos[s["code"]][0], y=pos[s["code"]][1]) for s in SOURCES]
    res = run.asset_resolution

    def cnt(src):
        rows = [x for (s, _), x in res.items() if s == src]
        return len([x for x in rows if x["candidate_assets"] == 1]), len([x for x in rows if x["candidate_assets"] == 0])

    mc = run.match_candidates
    rel_auto = len([c for c in mc if c["source"] == "01" and c["status"] == "auto"])
    rel_rev = len([c for c in mc if c["source"] == "01" and c["status"] == "review"])
    sf_auto = len([c for c in mc if c["source"] == "04" and c["status"] == "auto"])
    sf_rev = len([c for c in mc if c["source"] == "04" and c["status"] == "review"])
    con = sql["q_contact_account"]
    ctr = sql["q_contract_account"]
    mv_ok, mv_un = cnt("07")
    sv_ok, sv_un = cnt("08")
    od_ok, od_un = cnt("09")
    inv_ok = len([x for x in sql["q_invoice_order_join"] if x["order_found"]])
    roles = sql["q_order_account_roles"]
    owner_ok = len([r for r in R["06"] if not blank(r["Owning_ERP_Customer_No"])])
    loc_conflict = len([x for x in run.order_asset.values() if x["status"] != "consistent"])
    site_links = [run.assets[a]["site_link"]["band"] for a in run.assets]
    pay = sql["q_invoice_payer_consistency"]
    edges = [
        dict(id="E01", source="01", target="02", type="inferred", label="facility match", join="name + address scoring -> ERP facility group",
             columns=["Legal_Name", "DBA_Name", "Hierarchy_Account_Address", "Address"], matched=rel_auto, review=rel_rev, unresolved=0,
             evidence=f"{rel_auto} Reltio facilities auto-matched, {rel_rev} same-entity candidates in review"),
        dict(id="E02", source="04", target="02", type="inferred", label="facility match", join="name + street/city scoring -> ERP facility group",
             columns=["Account_Name", "Billing_Street", "Billing_City", "Address"], matched=sf_auto, review=sf_rev, unresolved=0,
             evidence=f"{sf_auto} Salesforce accounts auto-matched, {sf_rev} in review"),
        dict(id="E03", source="03", target="04", type="native", label="contact -> account", join='"Salesforce_Account_ID"',
             columns=["Salesforce_Account_ID"], matched=len([x for x in con if x["join_status"] == "native_match"]), review=0,
             unresolved=len([x for x in con if x["join_status"] != "native_match"]), evidence="Exact native key; blanks and IDs outside the extract stay unresolved"),
        dict(id="E04", source="05", target="04", type="native", label="contract -> account", join='"Salesforce_Account_ID"',
             columns=["Salesforce_Account_ID"], matched=len([x for x in ctr if x["join_status"] == "native_match"]), review=0,
             unresolved=len([x for x in ctr if x["join_status"] != "native_match"]), evidence="Exact native key; 2 contracts carry no account"),
        dict(id="E05", source="10", target="09", type="native", label="invoice -> order", join='"Reference_Sales_Order" = "SAP_Sales_Order"',
             columns=["Reference_Sales_Order", "SAP_Sales_Order"], matched=inv_ok, review=0, unresolved=len(R["10"]) - inv_ok,
             evidence="Native transactional join"),
        dict(id="E06", source="09", target="02", type="native", label="order roles -> ERP accounts", join='"Sold_To_No" / "Ship_To_No" / "Bill_To_No" / "Payer_No" = "ERP_Customer_ID"',
             columns=["Sold_To_No", "Ship_To_No", "Bill_To_No", "Payer_No", "ERP_Customer_ID"], matched=len([x for x in roles if x["account_found"]]), review=0,
             unresolved=len([x for x in roles if not x["account_no"]]), evidence="Each role is a separate relationship"),
        dict(id="E07", source="10", target="02", type="native", label="invoice payer -> ERP payer", join='"Payer_Account_No" = "ERP_Customer_ID"',
             columns=["Payer_Account_No", "ERP_Customer_ID"], matched=len([x for x in pay if x["invoice_payer"]]), review=0,
             unresolved=len([x for x in pay if not x["invoice_payer"]]), evidence="Blank payers resolved from the order in review"),
        dict(id="E08", source="07", target="06", type="native", label="movement -> asset", join="tag or normalized serial via identifier index",
             columns=["Asset_Tag", "Scanned_Serial", "Electronic_Asset_ID", "Serial_Number"], matched=mv_ok, review=0, unresolved=len(R["07"]) - mv_ok,
             evidence="Strong IDs only; one serial resolves only after normalization"),
        dict(id="E09", source="08", target="06", type="native", label="service -> asset", join="tag or normalized serial via identifier index",
             columns=["Equipment_Tag", "Observed_Serial", "Electronic_Asset_ID", "Serial_Number"], matched=sv_ok, review=0, unresolved=len(R["08"]) - sv_ok,
             evidence=f"{len(R['08']) - sv_ok} visits name no device"),
        dict(id="E10", source="09", target="06", type="native", label="order -> asset (serial)", join='normalized "Equipment_Serial" = normalized "Serial_Number"',
             columns=["Equipment_Serial", "Serial_Number"], matched=od_ok, review=0, unresolved=len(R["09"]) - od_ok - od_un,
             evidence="Only where the serial is populated"),
        dict(id="E11", source="09", target="06", type="conflict", label="order site vs asset site", join="sold-to facility vs asset location at order date",
             columns=["Sold_To_No", "Order_Created_On", "Destination_Location", "Movement_Date"], matched=0, review=loc_conflict, unresolved=0,
             evidence=f"{loc_conflict} orders tied to a facility the asset has left"),
        dict(id="E12", source="06", target="02", type="native", label="asset owner -> ERP", join='"Owning_ERP_Customer_No" = "ERP_Customer_ID"',
             columns=["Owning_ERP_Customer_No", "ERP_Customer_ID"], matched=owner_ok, review=0, unresolved=len(R["06"]) - owner_ok,
             evidence=f"{len(R['06']) - owner_ok} assets have no owner; inferred per facility in review"),
        dict(id="E13", source="06", target="01", type="inferred", label="asset site -> facility", join="site name similarity -> golden facility",
             columns=["Site_Name", "Site_Address", "Legal_Name", "DBA_Name"], matched=site_links.count("auto"), review=site_links.count("review"),
             unresolved=site_links.count("blank") + site_links.count("unresolved"), evidence="Name alone proposes; address or owner corroborates"),
        dict(id="E14", source="05", target="09", type="unresolved", label="contract covers order", join="facility + covered material",
             columns=["Pricing_Schedule_by_Transaction_Type", "Material_Number"],
             matched=len([x for x in sql["q_order_entitlement"] if x["entitlement_status"] == "covered"]),
             review=len([x for x in sql["q_order_entitlement"] if x["Contract_ID"] and x["entitlement_status"] != "covered"]),
             unresolved=len([x for x in sql["q_order_entitlement"] if not x["Contract_ID"]]), evidence="Derived through the facility crosswalk; unlinked contracts leave orders uncovered"),
    ]
    return dict(nodes=nodes, edges=edges, legend={"native": "Native verified join", "inferred": "Inferred candidate",
                                                   "conflict": "Conflict", "unresolved": "Unresolved / derived"})


def build_relationships(run: Run) -> list[dict]:
    rels = []
    n = 0

    def add(kind, src, tgt, status, conf, evidence, valid_from=None, valid_to=None, review=None):
        nonlocal n
        n += 1
        rels.append(dict(rel_id=f"RL-{n:04d}", type=kind, source_id=src, target_id=tgt, status=status, confidence=round(conf, 2),
                         evidence=evidence, valid_from=valid_from, valid_to=valid_to, review_item=review))
    for gid, f in run.facilities.items():
        add("facility_rolls_up_to_party", gid, "GP-001", "native", 1.0, "ERP parent account and Reltio hierarchy")
        for x in f["crosswalk"]:
            add("facility_source_ref", gid, f"{x['table']}:{x['native_id']}", x["status"], x["score"], x["method"],
                review=(run.item_for.get(("xwalk", x["native_id"])) or [None])[0])
    for a in run.assets.values():
        add("asset_at_facility", a["asset_id"], a["proposed_facility"], "conflict" if a["location_status"] == "conflict" else "native" if a["ib_basis"] else "unresolved",
            a["location_confidence"], "; ".join(a["location_evidence"]) or f"install base {a['ib_basis']}", valid_from=a["moved_on"],
            review=(run.item_for.get(("asset", a["asset_id"])) or [None])[0])
        if not blank(a["owner_raw"]):
            add("asset_owned_by", a["asset_id"], a["owner_raw"], "native", 1.0, "Owning_ERP_Customer_No")
    for so, x in run.order_asset.items():
        add("order_for_asset", so, x["asset_id"], "conflict" if x["status"] != "consistent" else "native", 1.0 if x["status"] == "consistent" else 0.6,
            x["status"].replace("_", " "), review=(run.item_for.get(("order", so)) or [None])[0])
    for r in run.rows["10"]:
        add("invoice_for_order", r["SAP_Billing_Document"], r["Reference_Sales_Order"], "native", 1.0, "Reference_Sales_Order")
    return rels


def build_golden(run: Run, sql: dict, ar: dict) -> tuple[dict, dict]:
    R, F = run.rows, run.facilities
    xw = run.xwalk_index()
    so = run.rows_by_so()
    inv_by_so = {r["Reference_Sales_Order"]: r for r in R["10"]}
    facilities, lineage = [], {}
    for gid, f in F.items():
        surv = f["reltio_survivor"]
        contracts = [c for c in R["05"] if xw.get(("sf_accounts", c["Salesforce_Account_ID"])) == gid]
        sf_ids = {x["native_id"] for x in f["crosswalk"] if x["table"] == "sf_accounts"}
        contacts = [c for c in R["03"] if c["Salesforce_Account_ID"] in sf_ids]
        orders = [o for o in R["09"] if run.facility_of_account(o["Sold_To_No"]) == gid]
        assets = [a for a in run.assets.values() if a["proposed_facility"] == gid or a["ib_facility"] == gid]
        ar_rows = [x for x in ar["invoices"] if x["facility"] == gid]
        open_items = sorted({rid for key in [("facility", gid)] + [("xwalk", x["native_id"]) for x in f["crosswalk"]] +
                             [("asset", a["asset_id"]) for a in assets] + [("order", o["SAP_Sales_Order"]) for o in orders] +
                             [("contract", c["Contract_ID"]) for c in contracts] for rid in run.item_for.get(key, [])})
        addr_ev = []
        if surv:
            addr_ev.append(dict(source="01", rid=surv["_rid"], column="Hierarchy_Account_Address", value=surv["Hierarchy_Account_Address"], rank=1))
        for x in f["crosswalk"]:
            if x["table"] == "sap_accounts" and x["address"]:
                addr_ev.append(dict(source="02", rid=x["rid"], column="Address", value=x["address"], rank=2))
            if x["table"] == "sf_accounts":
                row = run.by_rid[x["rid"]]
                addr_ev.append(dict(source="04", rid=x["rid"], column="Billing_Street + Billing_City", value=", ".join(v for v in (row["Billing_Street"], row["Billing_City"]) if v), rank=3))
        seen, ranked = set(), []
        for e in addr_ev:
            if e["value"] and e["value"] not in seen:
                seen.add(e["value"])
                ranked.append(e)
        name_ev = [dict(source=r["_rid"].split(":")[0], rid=r["_rid"], column=fld, value=r[fld], rank=1 if code == "01" else 2 if code == "02" else 3)
                   for code, fld, r, link in run.mentions if (link["golden_facility_id"] or link["candidate"]) == gid and code in ("01", "02", "04")]
        dhc = surv["Definitive_Healthcare_ID"] if surv else ""
        lineage[gid] = dict(
            display_name=dict(selected=f["display_name"], rule="Reltio DBA of the auto-matched profile, else most frequent ERP name", values=name_ev),
            address=dict(selected=ranked[0]["value"] if ranked else None, rule="Rank Reltio > ERP > Salesforce; competing values retained", values=ranked),
            dhc_id=dict(selected=dhc or None, rule="Reltio survivor; duplicates contribute only after an approved merge",
                        values=[dict(source="01", rid=c["rid"], column="Definitive_Healthcare_ID", value=c["row"]["Definitive_Healthcare_ID"], rank=1 if c["status"] == "auto" else 2)
                                for c in run.match_candidates if c["golden_facility_id"] == gid and c["source"] == "01"]),
            payment_terms=dict(selected=surv["Payment_Terms"] if surv else None, rule="Reltio survivor billing policy",
                               values=[dict(source="01", rid=c["rid"], column="Payment_Terms", value=c["row"]["Payment_Terms"], rank=1 if c["status"] == "auto" else 2)
                                       for c in run.match_candidates if c["golden_facility_id"] == gid and c["source"] == "01"]),
        )
        facilities.append(dict(
            golden_id=gid, display_name=f["display_name"], city=f["city"], address=lineage[gid]["address"]["selected"], dhc_id=dhc or None,
            payment_terms=surv["Payment_Terms"] if surv else None, billing_preference=surv["Billing_Requirements_and_Preferences"] if surv else None,
            parent_party_id="GP-001", erp_systems=f["erp_systems"], sold_to=f["sold_to"], payer=f["payer"],
            crosswalk=[{k: v for k, v in x.items()} | {"review_item": (run.item_for.get(("xwalk", x["native_id"])) or [None])[0] if x["status"] == "review" else None} for x in f["crosswalk"]],
            name_variants=[{"value": v, "count": c} for v, c in f["name_variants"].most_common()],
            counts=dict(assets=len(assets), contracts=len(contracts), contacts=len(contacts), orders=len(orders),
                        invoices=len(ar_rows), open_invoices=len([x for x in ar_rows if x["open_usd"] > 0])),
            open_ar_usd=sum(x["open_usd"] for x in ar_rows), associated_ar_usd=sum(x["open_usd"] for x in ar_rows if x["association"] == "structural"),
            asset_ids=sorted(a["asset_id"] for a in assets), contract_ids=[c["Contract_ID"] for c in contracts],
            contact_ids=[c["Universal_Contact_ID"] for c in contacts], order_ids=[o["SAP_Sales_Order"] for o in orders],
            open_issues=open_items,
        ))
    ent = run.enterprise
    party = dict(golden_id="GP-001", legal_name=ent["reltio"]["Legal_Name"], dba_name=ent["reltio"]["DBA_Name"],
                 address=ent["reltio"]["Hierarchy_Account_Address"], payment_terms=ent["reltio"]["Payment_Terms"],
                 classification=ent["reltio"]["Customer_Classification"],
                 source_refs=[dict(source="01", native_id=ent["reltio"]["Reltio_Record_ID"], rid=ent["reltio"]["_rid"], name=ent["reltio"]["Legal_Name"], status="native")] +
                             [dict(source="02", native_id=r["ERP_Customer_ID"], system=r["ERP_System"], rid=r["_rid"], name=r["Legal_Name"],
                                   status="review" if len(ent["erp_rows"]) > 1 else "native") for r in ent["erp_rows"]],
                 open_issues=run.item_for.get(("party", "GP-001"), []))
    assets = []
    for a in sorted(run.assets.values(), key=lambda x: x["asset_id"]):
        assets.append(dict(
            asset_id=a["asset_id"], rid=a["rid"], serial=a["serial"], serial_normalized=a["serial_normalized"], product_family=a["product_family"],
            material=a["material"], udi=a["udi"] or None, status=a["status"], warranty_end=a["warranty_end"], location_label=a["location_label"],
            site_name_raw=a["site_name"] or None, ib_facility=a["ib_facility"], ib_basis=a["ib_basis"], proposed_facility=a["proposed_facility"],
            location_status=a["location_status"], location_confidence=a["location_confidence"], location_evidence=a["location_evidence"],
            moved_on=a["moved_on"], moved_from=a["moved_from"], owner_raw=a["owner_raw"] or None,
            owner_proposed=a["owner_raw"] or (F[a["ib_facility"]]["sold_to"] if a["ib_facility"] else None),
            owner_status="native" if a["owner_raw"] else "proposed" if a["ib_facility"] else "unknown",
            timeline=a["timeline"], orders=sorted(a["orders"]), open_issues=run.item_for.get(("asset", a["asset_id"]), [])))
    contracts = []
    ctr_sql = {x["Contract_ID"]: x for x in sql["q_contract_account"]}
    for c in R["05"]:
        x = ctr_sql[c["Contract_ID"]]
        contracts.append(dict(contract_id=c["Contract_ID"], rid=c["_rid"], account=c["Salesforce_Account_ID"] or None,
                              facility=xw.get(("sf_accounts", c["Salesforce_Account_ID"])), covered_material=x["covered_material"],
                              schedule=c["Pricing_Schedule_by_Transaction_Type"], level=c["Entitlement_Levels"], status=c["Contract_Status"],
                              term_begin=c["Term_Begin_Date"], term_end=c["Term_End_Date"] or None, po_required=c["PO_Required"],
                              join_status=x["join_status"], open_issues=run.item_for.get(("contract", c["Contract_ID"]), [])))
    contacts = []
    for c in R["03"]:
        contacts.append(dict(contact_id=c["Universal_Contact_ID"], rid=c["_rid"], name=f"{c['First_Name']} {c['Last_Name']}", type=c["BD_Contact_Type"],
                             department=c["Department_Category"], account=c["Salesforce_Account_ID"] or None,
                             facility=xw.get(("sf_accounts", c["Salesforce_Account_ID"])), status=c["Contact_Status"], email=c["Business_Email"] or None))
    orders = []
    for o in R["09"]:
        ent_x = run.entitlement.get(o["SAP_Sales_Order"], {})
        oa = run.order_asset.get(o["SAP_Sales_Order"])
        inv = inv_by_so.get(o["SAP_Sales_Order"])
        orders.append(dict(order_id=o["SAP_Sales_Order"], rid=o["_rid"], date=o["Order_Created_On"], client=o["SAP_Client"],
                           facility=run.facility_of_account(o["Sold_To_No"]), sold_to=o["Sold_To_No"], ship_to=o["Ship_To_No"] or None,
                           bill_to=o["Bill_To_No"] or None, payer=o["Payer_No"] or None, material=o["Material_Number"], serial=o["Equipment_Serial"] or None,
                           asset_id=oa["asset_id"] if oa else None, asset_link=oa["status"] if oa else None, po=o["Customer_PO_Number"] or None,
                           type=o["Order_Type"], value_usd=fnum(o["Net_Value_USD"]), contract=ent_x.get("Contract_ID"),
                           entitlement=ent_x.get("entitlement_status"), invoice=inv["SAP_Billing_Document"] if inv else None,
                           open_issues=run.item_for.get(("order", o["SAP_Sales_Order"]), [])))
    golden = dict(party=party, facilities=facilities, assets=assets, contracts=contracts, contacts=contacts, orders=orders,
                  publish_rule=f"Published: native joins and matches >= {AUTO_THRESHOLD}. Candidates {REVIEW_THRESHOLD}-{AUTO_THRESHOLD} appear only after a reviewer approves them; conflicts stay open issues.")
    return golden, lineage


def build_profiles_with_quality(run: Run, profiles: dict) -> dict:
    by_file = defaultdict(list)
    for r in run.rules.values():
        for code in r["files"]:
            by_file[code].append(r)
    res = run.asset_resolution
    linked = {}
    R = run.rows
    xw = run.xwalk_index()
    linked["01"] = [r["_rid"] for r in R["01"] if r["Hierarchy_Level"] == "Enterprise Parent" or any(c["rid"] == r["_rid"] and c["status"] == "auto" for c in run.match_candidates)]
    linked["02"] = [r["_rid"] for r in R["02"]]
    linked["03"] = [r["_rid"] for r in R["03"] if xw.get(("sf_accounts", r["Salesforce_Account_ID"]))]
    linked["04"] = [r["_rid"] for r in R["04"] if xw.get(("sf_accounts", r["Salesforce_Account_ID"]))]
    linked["05"] = [r["_rid"] for r in R["05"] if xw.get(("sf_accounts", r["Salesforce_Account_ID"]))]
    linked["06"] = [r["_rid"] for r in R["06"] if run.assets[r["Electronic_Asset_ID"]]["ib_facility"]]
    linked["07"] = [r["_rid"] for r in R["07"] if (("07", r["_rid"]) in res and res[("07", r["_rid"])]["candidate_assets"] == 1)]
    linked["08"] = [r["_rid"] for r in R["08"] if (("08", r["_rid"]) in res and res[("08", r["_rid"])]["candidate_assets"] == 1)]
    linked["09"] = [r["_rid"] for r in R["09"] if run.facility_of_account(r["Sold_To_No"])]
    linked["10"] = [r["_rid"] for r in R["10"] if r["Reference_Sales_Order"] in run.rows_by_so()]
    link_basis = {"01": "auto-matched to a golden facility (or is the enterprise parent)", "02": "grouped by ERP facility number",
                  "03": "account resolves to a golden facility", "04": "auto-matched to a golden facility", "05": "account resolves to a golden facility",
                  "06": "site, address or owner identifies a facility", "07": "identifier resolves to one asset", "08": "identifier resolves to one asset",
                  "09": "sold-to resolves to a golden facility", "10": "order reference resolves"}
    raw_linked = {"07": len([1 for (s, _), x in res.items() if s == "07" and x["candidate_assets"] == 1 and x["matched_without_normalization"]]),
                  "09": len([r for r in R["09"] if run.facility_of_account(r["Sold_To_No"])])}
    for code, p in profiles.items():
        n = p["record_count"]
        dims = {}
        for dim in ("completeness", "validity", "consistency"):
            rules = [r for r in by_file[code] if r["dimension"] == dim and r["severity"] != "info"]
            elig = {x for r in rules for x in r["eligible_rids"] if x.startswith(code + ":")}
            bad = {x for r in rules for x in r["affected_rids"] if x.startswith(code + ":")}
            material = {x for r in rules if r["severity"] in ("high", "medium") for x in r["affected_rids"] if x.startswith(code + ":")}
            high = {x for r in rules if r["severity"] == "high" for x in r["affected_rids"] if x.startswith(code + ":")}
            if not rules:
                dims[dim] = dict(status="n/a", failing=0, eligible=0, rate=None, rules=0)
                continue
            rate = len(bad) / len(elig) if elig else 0
            mrate = len(material) / len(elig) if elig else 0
            hrate = len(high) / len(elig) if elig else 0
            status = "red" if mrate >= RAG_THRESHOLDS["red_fail_rate"] or hrate >= RAG_THRESHOLDS["red_high_severity_rate"] else "amber" if bad else "green"
            dims[dim] = dict(status=status, failing=len(bad), eligible=len(elig), rate=round(rate, 3), rules=len(rules))
        lk = len(linked[code])
        lrate = lk / n if n else 0
        dims["linkability"] = dict(status="green" if lrate >= RAG_THRESHOLDS["link_green"] else "amber" if lrate >= RAG_THRESHOLDS["link_amber"] else "red",
                                   linked=lk, eligible=n, rate=round(lrate, 3), basis=link_basis[code],
                                   linked_without_normalization=raw_linked.get(code))
        p["quality"] = dims
        order = {"red": 0, "amber": 1, "green": 2, "n/a": 3}
        p["overall_status"] = min((d_["status"] for d_ in dims.values()), key=lambda s: order[s])
        p["rule_ids"] = sorted(r["rule_id"] for r in by_file[code])
        p["finding_count"] = len([f for f in run.findings if f["source"] == code])
    return profiles


def executive_summary(run: Run, profiles: dict, mappings: list, ar: dict) -> dict:
    t = ar["totals"]
    q = Counter(x["queue"] for x in run.review)
    worst = sorted(profiles.values(), key=lambda p: -p["finding_count"])[:3]
    owners = defaultdict(lambda: {"items": 0, "open_ar_usd": 0.0, "titles": []})
    for x in run.review:
        o = owners[x["owner"]]
        o["items"] += 1
        o["open_ar_usd"] += x["downstream"].get("open_ar_usd", 0) or 0
        if len(o["titles"]) < 3:
            o["titles"].append(x["title"])
    top_cat = max(ar["by_category"], key=lambda c: c["open_usd_primary"] if c["structural"] else -1)
    mv = next(m for m in mappings if m["field"] == "asset.identity")

    def usd(v):
        return f"${v:,.0f}"
    claims = [
        dict(id="CL-1", text=f"{len(SOURCES)} extracts, {sum(p['record_count'] for p in profiles.values())} records profiled; {len(run.findings)} findings under {len(run.rules)} documented rules.",
             measures=["source_profiles.record_count", "dq_findings.count"]),
        dict(id="CL-2", text=f"{len(run.facilities)} facilities and 1 enterprise party connect {len([c for c in run.match_candidates if c['status'] == 'auto'])} auto-matched CRM/MDM records; "
                             f"{q['identity']} same-entity questions wait for a reviewer.", measures=["match_candidates.status", "review_queue.identity"]),
        dict(id="CL-3", text=f"Asset identifiers: {mv['coverage']}.", measures=["mapping_proposals.MAP asset.identity"]),
        dict(id="CL-4", text=f"Open AR is {usd(t['open_usd'])} on {t['open_invoices']} invoices; {usd(t['associated_usd'])} on {t['associated_invoices']} invoices is associated with an identified data issue "
                             f"(largest: {top_cat['label'].lower()}, {usd(top_cat['open_usd_primary'])}).", measures=["ar_exposure.totals", "ar_exposure.by_category"]),
        dict(id="CL-5", text=f"A further {usd(t['note_only_usd'] + t['missing_link_usd'])} carries collection notes the extracts cannot corroborate; it is reported separately, not as exposure.",
             measures=["ar_exposure.totals.note_only_usd", "ar_exposure.totals.missing_link_usd"]),
    ]
    res = run.asset_resolution
    refs = [x for (src_, _), x in res.items() if src_ in ("07", "08", "09")]
    ent = [x for x in run.entitlement.values()]
    change = [
        dict(id="asset_refs", label="Movement, service and order identifiers resolved to one asset", total=len(refs),
             before=len([x for x in refs if x["candidate_assets"] == 1 and x["matched_without_normalization"]]),
             after=len([x for x in refs if x["candidate_assets"] == 1]), basis="raw exact match vs normalized identifier index"),
        dict(id="crm_mdm_links", label="Reltio / Salesforce records tied to a facility", total=len(run.match_candidates), before=0,
             after=len([c for c in run.match_candidates if c["status"] == "auto"]), basis="no crosswalk existed in the extracts; reviewer approvals add to 'after'"),
        dict(id="order_contract", label="Orders that reach a covering contract", total=len(ent), before=0,
             after=len([x for x in ent if x["Contract_ID"]]), basis="order -> facility -> contract only exists through the crosswalk"),
        dict(id="asset_owner", label="Assets with an owner ERP account", total=len(run.assets),
             before=len([a for a in run.assets.values() if not blank(a["owner_raw"])]),
             after=len([a for a in run.assets.values() if not blank(a["owner_raw"])]), basis="inferred owners count once a reviewer confirms them"),
    ]
    return dict(
        change_metrics=change,
        headline=f"{usd(t['associated_usd'])} of {usd(t['open_usd'])} open AR is tied to relationships the data shows are broken or unverified.",
        claims=claims,
        concentration=[dict(code=p["code"], label=p["label"], findings=p["finding_count"], status=p["overall_status"]) for p in worst],
        review_counts=dict(q),
        next_actions=[dict(owner=k, items=v["items"], open_ar_usd=v["open_ar_usd"], examples=v["titles"]) for k, v in sorted(owners.items(), key=lambda kv: (-kv[1]["open_ar_usd"], -kv[1]["items"]))],
        label="Illustrative BD-style demo data",
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Driver
# ─────────────────────────────────────────────────────────────────────────────
def generate(input_path: Path, out_root: Path, as_of: str, bundle: Path | None, decisions_path: Path | None = None) -> dict:
    blobs = read_inputs(input_path)
    file_hashes = {name: sha256(b) for name, b in sorted(blobs.items())}
    input_hash = sha256("\n".join(f"{k}:{v}" for k, v in sorted(file_hashes.items())).encode())
    run_id = f"bd-{input_hash[:10]}"
    generated_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    header = dict(run_id=run_id, schema_version=SCHEMA_VERSION, input_hash=input_hash, generated_at=generated_at)

    src = parse_sources(blobs)
    counts = {code: len(src[code]["rows"]) for code in src}
    if counts != EXPECTED_COUNTS:
        raise SystemExit(f"record counts differ from the expected snapshot: {counts}")

    profiles = profile_sources(src)
    con = load_duckdb(src, as_of)
    log, sql = [], {}
    run_sql_stage(con, "A", log, sql)
    failed = [x for x in log if x["status"] != "ok"]
    if failed:
        raise SystemExit(f"SQL stage A failed: {[(x['sql_file'], x['error']) for x in failed]}")

    run = Run(src, as_of)
    run.run_basic_rules()
    run.match_facilities()
    run.build_facility_names()
    run.extend_crosswalk()
    run.resolve_assets(sql)
    run.run_linked_rules(sql)

    xw_rows = [(t, nid, gid) for (t, nid), gid in run.xwalk_index().items()]
    con.execute("CREATE TABLE xwalk (source_table VARCHAR, native_id VARCHAR, golden_facility_id VARCHAR)")
    con.executemany("INSERT INTO xwalk VALUES (?, ?, ?)", xw_rows)
    run_sql_stage(con, "B", log, sql)
    failed = [x for x in log if x["status"] != "ok"]
    if failed:
        raise SystemExit(f"SQL stage B failed: {[(x['sql_file'], x['error']) for x in failed]}")
    run.run_entitlement_rules(sql)
    run.build_review_queue(sql)
    ar = run.ar_exposure(sql)
    profiles = build_profiles_with_quality(run, profiles)
    mappings = build_mappings(run, sql)
    er = build_er_graph(run, sql)
    rels = build_relationships(run)
    golden, lineage = build_golden(run, sql, ar)
    summary = executive_summary(run, profiles, mappings, ar)

    decisions = []
    if decisions_path and decisions_path.exists():
        data = json.loads(decisions_path.read_text(encoding="utf-8"))
        if data.get("run_id") != run_id:
            raise SystemExit(f"decisions file belongs to run {data.get('run_id')}, not {run_id}")
        decisions = data.get("decisions", [])
        by_id = {x["review_id"]: x for x in run.review}
        for dcs in decisions:
            if dcs["review_id"] in by_id:
                by_id[dcs["review_id"]]["status"] = "decided"
                by_id[dcs["review_id"]]["reviewer_decision"] = dcs

    for c in run.match_candidates:
        c.pop("row", None)
    rules_out = []
    for r in run.rules.values():
        x = {k: v for k, v in r.items() if k not in ("eligible_rids", "affected_rids", "class_")}
        x["class"] = r["class_"]
        x["eligible"] = len(r["eligible_rids"])
        x["affected"] = len(r["affected_rids"])
        x["example_rows"] = r["affected_rids"][:5]
        x["eligible_by_file"] = dict(sorted(Counter(i.split(":")[0] for i in r["eligible_rids"]).items()))
        x["affected_by_file"] = dict(sorted(Counter(i.split(":")[0] for i in r["affected_rids"]).items()))
        rules_out.append(x)

    sql_texts = {f: (SQL_DIR / f).read_text(encoding="utf-8") for f, _, _ in SQL_STAGES}
    id_index = sql["identifier_index"]
    outputs = {
        "source_profiles.json": header | dict(as_of=as_of, rag_thresholds=RAG_THRESHOLDS, sources=list(profiles.values())),
        "source_rows.json": header | dict(sources={code: {"columns": src[code]["columns"], "rows": src[code]["rows"]} for code in src}),
        "dq_rules.json": header | dict(ruleset_version=RULESET_VERSION, rules=rules_out),
        "dq_findings.json": header | dict(findings=run.findings),
        "canonical_schema.json": header | dict(entities=[dict(entity=e, label=l, grain=g, native_keys=k, fields=[dict(name=n, type=t, description=dsc) for n, t, dsc in f])
                                                         for e, l, g, k, f in CANONICAL_ENTITIES]),
        "mapping_proposals.json": header | dict(mappings=mappings, thresholds=dict(auto=AUTO_THRESHOLD, review=REVIEW_THRESHOLD)),
        "match_candidates.json": header | dict(matcher_version=MATCHER_VERSION, candidates=run.match_candidates,
                                               mentions=[dict(source=c_, field=f_, rid=r_["_rid"], value=r_[f_], **l_) for c_, f_, r_, l_ in run.mentions]),
        "relationships.json": header | dict(relationships=rels),
        "er_graph.json": header | er,
        "execution_log.json": header | dict(as_of=as_of, statements=log, sql=sql_texts),
        "review_queue.json": header | dict(items=run.review),
        "review_decisions.json": header | dict(decisions=decisions, note="Replayable reviewer decisions. Export from the UI and pass with --decisions to re-run."),
        "golden_entities.json": header | golden,
        "golden_lineage.json": header | dict(facilities=lineage),
        "ar_exposure.json": header | ar,
        "executive_summary.json": header | summary,
    }

    out_dir = out_root / run_id
    (out_dir / "transformation_sql").mkdir(parents=True, exist_ok=True)
    out_hashes = {}
    for name, payload in outputs.items():
        text = json.dumps(payload, indent=1, ensure_ascii=False, default=str)
        (out_dir / name).write_text(text, encoding="utf-8")
        out_hashes[name] = sha256(json.dumps({k: v for k, v in payload.items() if k != "generated_at"}, sort_keys=True, default=str).encode())
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["source", "source_row_id", "id_type", "raw_value", "normalized_value"])
    for x in id_index:
        w.writerow([x["source"], x["source_row_id"], x["id_type"], x["raw_value"], x["normalized_value"]])
    (out_dir / "identifier_index.csv").write_text(buf.getvalue(), encoding="utf-8")
    for f, t in sql_texts.items():
        (out_dir / "transformation_sql" / f).write_text(t, encoding="utf-8")

    validation = validate_outputs(outputs, src, input_path, blobs)
    manifest = header | dict(
        as_of=as_of, input=input_path.name, sources=[dict(code=s["code"], file=s["file"], sha256=file_hashes[s["file"]], records=counts[s["code"]],
                                                         grain=s["grain"], native_key=s["key"]) for s in SOURCES],
        outputs=[dict(name=k, content_sha256=v) for k, v in out_hashes.items()], validation=validation,
        label="Illustrative BD-style demo data", command=f"uv run pipeline/bd_pipeline.py generate --input {input_path.name} --output {out_root.as_posix()}")
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    (out_dir / "validation_report.json").write_text(json.dumps(header | validation, indent=1), encoding="utf-8")
    (out_root / "latest.json").write_text(json.dumps(dict(run_id=run_id, path=f"{run_id}/", input_hash=input_hash, generated_at=generated_at), indent=1), encoding="utf-8")

    if bundle:
        files = {name.removesuffix(".json"): payload for name, payload in outputs.items()}
        files["manifest"] = manifest
        bundle.write_text("// Generated by pipeline/bd_pipeline.py - do not edit by hand.\n"
                          f"// Bundled copy of run {run_id} so the demo also works without a web server.\n"
                          "window.BD_BUNDLE = " + json.dumps(files, ensure_ascii=False, default=str, separators=(",", ":")) + ";\n", encoding="utf-8")
    return manifest


def validate_outputs(outputs: dict, src: dict, input_path: Path, blobs: dict) -> dict:
    checks = []

    def check(cid, desc, ok, detail=""):
        checks.append(dict(id=cid, check=desc, passed=bool(ok), detail=detail))
    profiles = outputs["source_profiles.json"]["sources"]
    check("A1", "Record counts 9/24/27/7/12/60/68/41/120/120", {p["code"]: p["record_count"] for p in profiles} == EXPECTED_COUNTS)
    rows = outputs["source_rows.json"]["sources"]
    check("a", "Every file has sample rows and an issue register", all(rows[p["code"]]["rows"] for p in profiles) and all(p["rule_ids"] for p in profiles))
    cols = {c for s in rows.values() for c in s["columns"]}
    er = outputs["er_graph.json"]
    bad_cols = [c for e in er["edges"] for c in e["columns"] if c not in cols]
    check("c", "ER edges reference actual columns", not bad_cols, ", ".join(bad_cols))
    rq = outputs["review_queue.json"]["items"]
    check("d", "Every review item has original/proposed values and source rows", all("old_value" in x and "proposed_value" in x and x["source_row_ids"] for x in rq))
    g = outputs["golden_entities.json"]
    check("e", "Golden facilities keep original IDs", all(f["crosswalk"] for f in g["facilities"]))
    ar = outputs["ar_exposure.json"]
    inv_ids = [x["invoice"] for x in ar["invoices"]]
    open_sum = sum(x["open_usd"] for x in ar["invoices"] if x["open_usd"] > 0)
    raw_open = sum(float(r["Open_Amount_USD"]) for r in src["10"]["rows"] if float(r["Open_Amount_USD"]) > 0)
    check("f", "AR reconciles to unique invoices", len(inv_ids) == len(set(inv_ids)) and abs(open_sum - raw_open) < 0.01 and abs(ar["totals"]["open_usd"] - raw_open) < 0.01,
          f"open {open_sum:,.2f} vs raw {raw_open:,.2f}")
    cats = sum(c["open_usd_primary"] for c in ar["by_category"]) + ar["totals"]["no_issue_usd"]
    check("f2", "Category split sums to total open AR (no double counting)", abs(cats - ar["totals"]["open_usd"]) < 0.01, f"{cats:,.2f}")
    log = outputs["execution_log.json"]["statements"]
    check("B", "All transformation SQL executed", all(x["status"] == "ok" for x in log), f"{len(log)} statements")
    check("i", "Outputs labeled as illustrative", outputs["executive_summary.json"]["label"] == "Illustrative BD-style demo data")
    after = read_inputs(input_path)
    check("C", "Raw input unchanged by the run", all(sha256(after[k]) == sha256(v) for k, v in blobs.items()))
    return dict(passed=all(c["passed"] for c in checks), checks=checks)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("generate", help="profile, map, match and publish a run")
    g.add_argument("--input", required=True, type=Path, help="zip or folder with the ten CSV extracts")
    g.add_argument("--output", default=REPO / "public" / "bd", type=Path, help="output root; the run lands in <output>/<run_id>/")
    g.add_argument("--as-of", default=DEFAULT_AS_OF, help="as-of date for aging and freshness (YYYY-MM-DD)")
    g.add_argument("--bundle", default=REPO / "bd_data.js", type=Path, help="bundled JS copy for file:// use ('' to skip)")
    g.add_argument("--decisions", type=Path, help="review_decisions.json exported from the UI")
    args = ap.parse_args(argv)
    if args.cmd == "generate":
        bundle = args.bundle if str(args.bundle) else None
        m = generate(args.input, args.output, args.as_of, bundle, args.decisions)
        print(f"run {m['run_id']}  input {m['input_hash'][:12]}  ->  {args.output / m['run_id']}")
        for s in m["sources"]:
            print(f"  {s['file']:<42} {s['records']:>4} rows")
        v = m["validation"]
        for c in v["checks"]:
            print(f"  [{'PASS' if c['passed'] else 'FAIL'}] {c['id']:<3} {c['check']} {c['detail']}")
        print("validation:", "PASSED" if v["passed"] else "FAILED")
        return 0 if v["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
