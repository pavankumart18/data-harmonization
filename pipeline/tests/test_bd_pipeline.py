"""Acceptance tests for the installed-base & receivables pipeline.

    uv run --with duckdb --with pytest pytest pipeline/tests -q
"""
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "pipeline"))
import bd_pipeline as bp  # noqa: E402

ZIP = REPO / "282_BD_MMS_Rebuilt_Raw_Source_Data.zip"


@pytest.fixture(scope="module")
def run(tmp_path_factory):
    out = tmp_path_factory.mktemp("bd")
    m = bp.generate(ZIP, out, bp.DEFAULT_AS_OF, out / "bundle.js")
    d = out / m["run_id"]
    load = lambda name: json.loads((d / name).read_text(encoding="utf-8"))  # noqa: E731
    return dict(manifest=m, dir=d, out=out, load=load)


def test_phase_a_record_counts(run):
    counts = {s["code"]: s["records"] for s in run["manifest"]["sources"]}
    assert counts == {"01": 9, "02": 24, "03": 27, "04": 7, "05": 12, "06": 60, "07": 68, "08": 41, "09": 120, "10": 120}


def test_prd_profile_observations(run):
    p = {s["code"]: {f["field"]: f for f in s["fields"]} for s in run["load"]("source_profiles.json")["sources"]}
    assert p["01"]["Definitive_Healthcare_ID"]["blank"] == 3
    assert p["01"]["Hierarchy_Parent_Reltio_ID"]["blank"] == 2
    assert p["02"]["Address"]["blank"] == 3 and p["02"]["Parent_ERP_Customer_ID"]["blank"] == 3
    assert (p["03"]["Business_Email"]["blank"], p["03"]["Phone_Number"]["blank"], p["03"]["Salesforce_Account_ID"]["blank"]) == (3, 3, 2)
    assert p["04"]["Billing_Street"]["blank"] == 1 and p["04"]["Parent_Salesforce_Account_ID"]["blank"] == 7
    assert (p["05"]["Salesforce_Account_ID"]["blank"], p["05"]["Source_Document_Location"]["blank"], p["05"]["Term_End_Date"]["blank"]) == (2, 2, 1)
    assert (p["06"]["Owning_ERP_Customer_No"]["blank"], p["06"]["Site_Address"]["blank"], p["06"]["Unique_Device_Identifier"]["blank"]) == (41, 9, 5)
    assert (p["07"]["Scanned_Serial"]["blank"], p["07"]["Asset_Tag"]["blank"]) == (44, 17)
    assert (p["08"]["Observed_Serial"]["blank"], p["08"]["Equipment_Tag"]["blank"], p["08"]["Customer_Site_Entered"]["blank"]) == (27, 9, 2)
    assert (p["09"]["Equipment_Serial"]["blank"], p["09"]["Customer_PO_Number"]["blank"], p["09"]["Payer_No"]["blank"]) == (30, 24, 4)
    assert (p["10"]["Payer_Account_No"]["blank"], p["10"]["Collection_Note"]["blank"]) == (7, 96)


def test_sql_executed_and_agrees_with_python(run):
    log = run["load"]("execution_log.json")
    assert all(s["status"] == "ok" for s in log["statements"])
    inv = next(s for s in log["statements"] if s["sql_file"] == "01_invoice_order_join.sql")
    assert inv["row_count"] == 120
    ar = run["load"]("ar_exposure.json")
    aging = next(s for s in log["statements"] if s["sql_file"] == "10_open_ar_aging.sql")
    assert aging["row_count"] == ar["totals"]["open_invoices"]


def test_serial_normalization_links_typo_rows(run):
    idx = (run["dir"] / "identifier_index.csv").read_text(encoding="utf-8")
    assert "ADC-2021-1O0007" in idx and "ADC-2021-100007" in idx
    assert ",," not in "\n".join(line for line in idx.splitlines() if line.endswith(","))  # blanks never indexed
    rq = run["load"]("review_queue.json")["items"]
    serial = next(x for x in rq if x["issue_type"] == "serial format")
    assert sorted(serial["old_value"]) == ["ADC-2021-1O0007", "ADC-2021-1O0043", "ADC-2O25-100035", "INF-2022-1O0020"]


def test_no_cross_system_mapping_without_evidence(run):
    g = run["load"]("golden_entities.json")
    for f in g["facilities"]:
        for x in f["crosswalk"]:
            assert x["status"] in ("native", "auto", "review")
            if x["status"] == "review":
                assert x["review_item"], x
    mc = run["load"]("match_candidates.json")["candidates"]
    assert all(c["features"]["name_similarity"] is not None and c["method"] for c in mc)
    fishers_dupes = [c["native_id"] for c in mc if c["status"] == "review"]
    assert set(fishers_dupes) == {"REL-ASC-0099", "REL-LEG-09213", "00149000000000006"}


def test_review_items_have_provenance(run):
    for x in run["load"]("review_queue.json")["items"]:
        for k in ("review_id", "entity_type", "issue_type", "source_row_ids", "old_value", "proposed_value", "evidence",
                  "rule_id", "rule_version", "confidence", "severity", "owner", "status", "decisions"):
            assert k in x, (x["review_id"], k)
        assert x["source_row_ids"]


def test_ar_reconciles_to_unique_invoices(run):
    ar = run["load"]("ar_exposure.json")
    ids = [x["invoice"] for x in ar["invoices"]]
    assert len(ids) == len(set(ids)) == 120
    t = ar["totals"]
    split = sum(c["open_usd_primary"] for c in ar["by_category"]) + t["no_issue_usd"]
    assert split == pytest.approx(t["open_usd"])
    assert sum(b["open_usd"] for b in ar["aging"]) == pytest.approx(t["open_usd"])
    assert t["associated_usd"] < t["open_usd"]  # association is never equated with the whole book


def test_entitlement_finding_is_evidence_backed(run):
    ar = run["load"]("ar_exposure.json")
    ent = [x for x in ar["invoices"] if "entitlement" in x["categories"]]
    assert ent and all(x["facility"] == "GF-004" and x["material"] == "MMS-INF-01" for x in ent)


def test_deterministic_and_raw_untouched(run, tmp_path):
    m2 = bp.generate(ZIP, tmp_path, bp.DEFAULT_AS_OF, None)
    assert m2["run_id"] == run["manifest"]["run_id"]
    assert [o["content_sha256"] for o in m2["outputs"]] == [o["content_sha256"] for o in run["manifest"]["outputs"]]
    assert run["manifest"]["validation"]["passed"]


def test_outputs_share_run_header(run):
    for o in run["manifest"]["outputs"]:
        data = run["load"](o["name"])
        assert data["run_id"] == run["manifest"]["run_id"]
        assert data["input_hash"] == run["manifest"]["input_hash"]
        assert data["schema_version"] == bp.SCHEMA_VERSION


def test_decisions_replay_and_mismatch_blocked(run, tmp_path):
    rq = run["load"]("review_queue.json")["items"]
    dec = {"run_id": run["manifest"]["run_id"], "decisions": [{"review_id": rq[0]["review_id"], "decision": "Same entity", "at": "2026-10-08T10:00:00Z"}]}
    p = tmp_path / "dec.json"
    p.write_text(json.dumps(dec), encoding="utf-8")
    m = bp.generate(ZIP, tmp_path / "o", bp.DEFAULT_AS_OF, None, p)
    rq2 = json.loads((tmp_path / "o" / m["run_id"] / "review_queue.json").read_text(encoding="utf-8"))["items"]
    assert rq2[0]["status"] == "decided"
    dec["run_id"] = "bd-other"
    p.write_text(json.dumps(dec), encoding="utf-8")
    with pytest.raises(SystemExit):
        bp.generate(ZIP, tmp_path / "o2", bp.DEFAULT_AS_OF, None, p)
