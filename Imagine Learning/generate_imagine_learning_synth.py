import csv, random
from datetime import date, timedelta
from collections import defaultdict

random.seed(42)

states = [("TX", "South"), ("CA", "West"), ("FL", "South"), ("NY", "Northeast"), ("IL", "Midwest"), ("GA", "South"), ("NC", "South"), ("PA", "Northeast"), ("OH", "Midwest"), ("AZ", "West"), ("CO", "West"), ("VA", "South")]
segments = ["Large District", "Mid-Market District", "Charter Network", "State/Regional"]
products = [
    ("Imagine Math", "Supplemental Math"),
    ("Imagine Language & Literacy", "Supplemental Literacy"),
    ("Courseware", "Core Courseware"),
    ("StudySync", "Core ELA"),
    ("Twig Science", "Science"),
    ("Imagine Learning PD", "Professional Learning"),
]
legacy_product_aliases = {
    "Courseware": ["Edgenuity Courseware", "CW", "Course Ware"],
    "StudySync": ["BookheadEd StudySync", "Study Sync", "ELA Core"],
    "Twig Science": ["Twig", "Twig Education", "Science Suite"],
    "Imagine Math": ["IM", "Math Suite", "ImagineMath"],
    "Imagine Language & Literacy": ["Language and Literacy", "ILL", "Imagine Literacy"],
    "Imagine Learning PD": ["Professional Development", "PL", "PD Services"],
}
roles = ["Teacher", "Instructional Coach", "Curriculum Director", "Principal", "District Admin", "Math Coordinator", "Literacy Specialist"]
subjects = ["Math", "Literacy", "ELA", "Science", "STEM", "General"]
grades = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
first_names = ["Monique", "Jane", "John", "Mark", "Sarah", "Lisa", "David", "Priya", "Carlos", "Emily", "Alicia", "Kevin", "Renee", "Michael", "Laura", "Tanisha", "Praveen", "Eric", "Sanjay", "Nina"]
last_names = ["Smith", "Lee", "Johnson", "Patel", "Garcia", "Brown", "Davis", "Wilson", "Martin", "Miller", "Thomas", "Anderson", "Taylor", "Moore", "Jackson", "White"]
base_district_names = ["Houston", "Riverview", "Oak Valley", "Pine Hills", "Maple Grove", "Cedar Ridge", "Springfield", "Lakeview", "Northfield", "Westbrook", "Easton", "Fairview", "Brookside", "Greenwood", "Hillcrest", "Sunnydale", "Redwood", "Silver Lake", "Meadow Park", "Canyon Creek", "Riverside", "Summit", "Heritage", "Franklin", "Jefferson", "Lincoln", "Roosevelt", "Adams", "Washington", "Madison", "Granite", "Blue Ridge", "Prairie", "Harbor", "Cypress", "Sierra", "Frontier", "Liberty", "Monroe", "Concord", "Hamilton", "Aurora", "Briarwood", "Highland", "Willow Creek", "Stonebridge", "Clearwater", "Gateway", "North Star", "Twin Oaks", "Valley View", "Golden Plains", "Parkside", "Millbrook", "Kingston", "Edgewater", "Shoreline", "Aspen", "Fox Run", "Elmwood"]


def slug(s):
    return ''.join(ch.lower() if ch.isalnum() else '_' for ch in s).strip('_')


def rand_phone():
    return f"({random.randint(200,999)}) {random.randint(200,999)}-{random.randint(1000,9999)}"


def maybe_blank(value, p):
    return "" if random.random() < p else value


def name_variant(base):
    variants = [base + " ISD", base + " Independent School District", base + " Public Schools", base + " School District", base + " Indep. SD"]
    return random.choice(variants)


def normalize_product_name(name):
    for canon, aliases in legacy_product_aliases.items():
        if name == canon or name in aliases:
            return canon
    return name


def create_districts(n=60):
    rows = []
    for i in range(n):
        state, region = random.choice(states)
        base = base_district_names[i]
        rows.append({
            "golden_customer_id": f"GC{str(i+1).zfill(4)}",
            "base_name": base,
            "canonical_account_name": f"{base} ISD" if random.random() < 0.55 else f"{base} School District",
            "state": state,
            "region": region,
            "segment": random.choices(segments, weights=[0.35,0.35,0.20,0.10])[0],
            "account_type": random.choices(["District", "Charter Network", "Regional Service Center"], weights=[0.75,0.15,0.10])[0],
            "country": "USA" if random.random() < 0.88 else random.choice(["Canada", "UAE", "UK", "India"]),
            "owner_rep": random.choice(["A. Rivera", "B. Shah", "C. Thomas", "D. Nguyen", "E. Carter", "F. Lewis"]),
            "student_enrollment": random.randint(2500, 110000),
            "annual_budget_band": random.choice(["<10M", "10M-25M", "25M-100M", ">100M"]),
        })
    return rows


def make_person():
    return random.choice(first_names), random.choice(last_names)


def email_for(fn, ln, domain):
    return random.choice([f"{fn.lower()}.{ln.lower()}@{domain}", f"{fn[0].lower()}{ln.lower()}@{domain}", f"{fn.lower()}{ln[0].lower()}@{domain}"])


def create_salesforce_crm(districts, target_rows=420):
    rows = []
    record = 10000
    for d in districts:
        # 5-9 crm records per district
        for _ in range(random.randint(5,9)):
            record += 1
            acct_name = random.choice([d["canonical_account_name"], name_variant(d["base_name"]), d["canonical_account_name"] + " - Supplemental", d["base_name"] + " Public Schools"])
            fn, ln = make_person()
            p_name, p_family = random.choice(products)
            prod_label = random.choice([p_name] + legacy_product_aliases[p_name]) if random.random() < 0.25 else p_name
            row = {
                "crm_record_id": f"CRM-{record}",
                "sf_account_id": f"SF-A{record}",
                "account_name": acct_name,
                "parent_account_name": random.choice([d["canonical_account_name"], d["base_name"] + " Schools", acct_name, ""]),
                "state": maybe_blank(d["state"], 0.05),
                "region": random.choice([d["region"], d["region"].lower(), d["region"].upper(), ""]) if random.random() < 0.18 else d["region"],
                "segment": random.choice([d["segment"], d["segment"].lower(), "Large", "Mid Market"]) if random.random() < 0.20 else d["segment"],
                "account_type": d["account_type"] if random.random() > 0.08 else random.choice(["School", "District", "District Office"]),
                "owner_rep": random.choice([d["owner_rep"], random.choice(["A. Rivera", "B. Shah", "C. Thomas", "D. Nguyen", "E. Carter", "F. Lewis"])]) if random.random() < 0.22 else d["owner_rep"],
                "contact_name": random.choice([f"{fn} {ln}", f"{fn[0]}. {ln}", f"{fn} A. {ln}"]) if random.random() < 0.15 else f"{fn} {ln}",
                "contact_email": maybe_blank(email_for(fn, ln, f"{slug(d['base_name'])}schools.org"), 0.18),
                "contact_role": maybe_blank(random.choice(roles), 0.18),
                "contact_subject": maybe_blank(random.choice(subjects), 0.30),
                "contact_grade_band": maybe_blank(random.choice(grades), 0.38),
                "opportunity_name": f"{acct_name} - {prod_label}",
                "product_name": prod_label,
                "product_family": p_family,
                "stage": random.choice(["Closed Won", "Closed Won", "Proposal", "Negotiation", "Closed Lost"]),
                "close_date": (date(2024,1,1) + timedelta(days=random.randint(0,700))).isoformat(),
                "contract_end_date": (date(2026,1,1) + timedelta(days=random.randint(0,700))).isoformat(),
                "arr_usd": random.choice([25000, 40000, 60000, 85000, 120000, 175000, 250000]) + random.randint(-4000, 6500),
                "seats_purchased": random.choice([300, 500, 800, 1500, 3000, 5000, 12000]),
                "quote_id": f"Q-{random.randint(5000,9999)}" if random.random() > 0.08 else "",
                "is_duplicate_candidate": "Y" if random.random() < 0.18 else "N",
                "source": "Salesforce",
                "true_golden_customer_id": d["golden_customer_id"],
            }
            rows.append(row)
    return rows[:target_rows]


def create_product_usage(districts, target_rows=420):
    rows = []
    record = 20000
    months = [date(2025,10,1), date(2025,11,1), date(2025,12,1)]
    for d in districts:
        org_variants = [d["canonical_account_name"], d["base_name"] + " Credit Recovery", d["base_name"] + " Math Program", d["base_name"] + " Literacy Pilot"]
        chosen_products = random.sample(products, k=random.randint(2,4))
        for org_name in random.sample(org_variants, k=random.randint(2,3)):
            for p_name, p_family in random.sample(chosen_products, k=min(len(chosen_products), random.randint(1,2))):
                for m in random.sample(months, k=random.randint(1,2)):
                    record += 1
                    rows.append({
                        "usage_record_id": f"PU-{record}",
                        "product_org_id": f"ORG-{record}",
                        "product_org_name": random.choice([org_name, org_name.upper(), slug(org_name).upper()]) if random.random() < 0.2 else org_name,
                        "product_name": p_name,
                        "product_family": p_family,
                        "usage_month": m.isoformat(),
                        "active_teachers": random.randint(3, 180),
                        "active_students": random.randint(40, 5500),
                        "weekly_sessions": random.randint(60, 22000),
                        "usage_health_score": random.randint(28, 96),
                        "implementation_status": random.choice(["Live", "Live", "Live", "Pilot", "Training", "Sandbox"]),
                        "school_scope": random.choice(["District-wide", "Selected Schools", "Single School"]),
                        "teacher_external_match_key": random.choice(["email", "name_school", "none"]),
                        "source": "ProductTelemetry",
                        "true_golden_customer_id": d["golden_customer_id"],
                    })
    return rows[:target_rows]


def create_contract_billing(districts, target_rows=240):
    rows = []
    record = 30000
    for d in districts:
        for _ in range(random.randint(3,5)):
            record += 1
            p_name, p_family = random.choice(products)
            rows.append({
                "billing_record_id": f"BILL-{record}",
                "contract_id": f"CT-{record}",
                "billing_customer_name": random.choice([d["canonical_account_name"], d["base_name"] + " Independent School District Finance", d["base_name"] + " Federal Programs", d["base_name"] + " Public Schools"]),
                "erp_customer_id": f"NS-{random.randint(7000,9999)}",
                "product_name_billing": random.choice([p_name] + legacy_product_aliases[p_name]) if random.random() < 0.35 else p_name,
                "product_family_billing": p_family,
                "contract_start_date": (date(2024,1,1) + timedelta(days=random.randint(0,600))).isoformat(),
                "contract_end_date": (date(2025,1,1) + timedelta(days=random.randint(300,1200))).isoformat(),
                "billing_status": random.choice(["Active", "Active", "Invoiced", "Expired", "Amendment Pending"]),
                "invoice_amount_usd": random.choice([22000, 39000, 61000, 89000, 125000, 180000, 255000]),
                "seats_contracted": random.choice([250, 400, 750, 1500, 2800, 5200, 10000]),
                "billing_country": d["country"],
                "is_netsuite_only_customer": "Y" if d["country"] != "USA" and random.random() < 0.6 else "N",
                "source": "NetSuite",
                "true_golden_customer_id": d["golden_customer_id"],
            })
    return rows[:target_rows]


def canonical_accounts(districts, salesforce_rows):
    by_gc = defaultdict(list)
    for r in salesforce_rows:
        by_gc[r["true_golden_customer_id"]].append(r)
    rows = []
    for d in districts:
        if d["golden_customer_id"] not in by_gc:
            continue
        rows.append({
            "golden_customer_id": d["golden_customer_id"],
            "canonical_account_name": d["canonical_account_name"],
            "state": d["state"],
            "region": d["region"],
            "segment": d["segment"],
            "account_type": d["account_type"],
            "country": d["country"],
            "owner_rep": d["owner_rep"],
            "student_enrollment": d["student_enrollment"],
            "annual_budget_band": d["annual_budget_band"],
            "salesforce_source_record_count": len(by_gc[d["golden_customer_id"]]),
            "source_systems_present": "Salesforce|ProductTelemetry|NetSuite",
        })
    return rows


def canonical_contacts(salesforce_rows):
    pick = {}
    for r in salesforce_rows:
        key = (r["true_golden_customer_id"], r["contact_name"].replace("A. ", "").replace(". ", " ").lower().replace('  ', ' '), r["contact_email"].lower() if r["contact_email"] else "")
        score = 0
        score += 2 if r["contact_email"] else 0
        score += 1 if r["contact_role"] else 0
        score += 1 if r["contact_subject"] else 0
        score += 1 if r["contact_grade_band"] else 0
        if key not in pick or score > pick[key][0]:
            pick[key] = (score, r)
    rows, gid = [], 40000
    for _, (_, r) in pick.items():
        gid += 1
        rows.append({
            "golden_contact_id": f"GCON-{gid}",
            "golden_customer_id": r["true_golden_customer_id"],
            "canonical_contact_name": r["contact_name"].replace("A. ", "").replace(". ", " "),
            "best_email": r["contact_email"],
            "best_role": r["contact_role"],
            "best_subject": r["contact_subject"],
            "best_grade_band": r["contact_grade_band"],
        })
    return rows


def canonical_customer_product_view(districts, salesforce_rows, product_rows, billing_rows):
    crm = defaultdict(lambda: defaultdict(lambda: {"arr":0, "seats":0, "opp":0}))
    for r in salesforce_rows:
        p = normalize_product_name(r["product_name"])
        if r["stage"] == "Closed Won":
            crm[r["true_golden_customer_id"]][p]["arr"] += int(r["arr_usd"])
            crm[r["true_golden_customer_id"]][p]["seats"] += int(r["seats_purchased"])
            crm[r["true_golden_customer_id"]][p]["opp"] += 1
    usage = defaultdict(lambda: defaultdict(lambda: {"teachers":0, "students":0, "health":0, "months":0}))
    for r in product_rows:
        if r["implementation_status"] in ("Training", "Sandbox"):
            continue
        p = normalize_product_name(r["product_name"])
        usage[r["true_golden_customer_id"]][p]["teachers"] += int(r["active_teachers"])
        usage[r["true_golden_customer_id"]][p]["students"] += int(r["active_students"])
        usage[r["true_golden_customer_id"]][p]["health"] += int(r["usage_health_score"])
        usage[r["true_golden_customer_id"]][p]["months"] += 1
    bill = defaultdict(lambda: defaultdict(lambda: {"amt":0, "seats":0, "contracts":0}))
    for r in billing_rows:
        p = normalize_product_name(r["product_name_billing"])
        bill[r["true_golden_customer_id"]][p]["amt"] += int(r["invoice_amount_usd"])
        bill[r["true_golden_customer_id"]][p]["seats"] += int(r["seats_contracted"])
        bill[r["true_golden_customer_id"]][p]["contracts"] += 1
    rows = []
    for d in districts:
        for p, _ in products:
            u = usage[d["golden_customer_id"]][p]
            avg_health = round(u["health"] / u["months"], 1) if u["months"] else ""
            owned = "Y" if crm[d["golden_customer_id"]][p]["arr"] > 0 or bill[d["golden_customer_id"]][p]["amt"] > 0 else "N"
            whitespace = "Y" if owned == "N" and random.random() < 0.35 else "N"
            rows.append({
                "golden_customer_id": d["golden_customer_id"],
                "canonical_account_name": d["canonical_account_name"],
                "product_name": p,
                "owned_flag": owned,
                "crm_arr_usd": crm[d["golden_customer_id"]][p]["arr"],
                "billing_amount_usd": bill[d["golden_customer_id"]][p]["amt"],
                "contracted_seats": bill[d["golden_customer_id"]][p]["seats"],
                "active_teachers_3m": u["teachers"],
                "active_students_3m": u["students"],
                "avg_usage_health_score": avg_health,
                "cross_sell_whitespace_flag": whitespace,
            })
    return rows


def source_to_golden_mapping(salesforce_rows, product_rows, billing_rows):
    rows = []
    mid = 50000
    for r in salesforce_rows:
        mid += 1
        rows.append({
            "mapping_id": f"MAP-{mid}",
            "source_system": "Salesforce",
            "source_record_id": r["crm_record_id"],
            "source_business_key": r["account_name"],
            "golden_customer_id": r["true_golden_customer_id"],
            "match_confidence": round(random.uniform(0.82, 0.99), 2),
            "match_method": random.choice(["name_state", "name_parent", "name_contact_domain"]),
        })
    for r in product_rows[:180]:
        mid += 1
        rows.append({
            "mapping_id": f"MAP-{mid}",
            "source_system": "ProductTelemetry",
            "source_record_id": r["usage_record_id"],
            "source_business_key": r["product_org_name"],
            "golden_customer_id": r["true_golden_customer_id"],
            "match_confidence": round(random.uniform(0.76, 0.97), 2),
            "match_method": random.choice(["name_state", "org_alias", "manual_review"]),
        })
    for r in billing_rows[:120]:
        mid += 1
        rows.append({
            "mapping_id": f"MAP-{mid}",
            "source_system": "NetSuite",
            "source_record_id": r["billing_record_id"],
            "source_business_key": r["billing_customer_name"],
            "golden_customer_id": r["true_golden_customer_id"],
            "match_confidence": round(random.uniform(0.79, 0.98), 2),
            "match_method": random.choice(["name_country", "finance_alias", "manual_review"]),
        })
    return rows


def write_csv(path, rows):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main():
    districts = create_districts(60)
    salesforce_rows = create_salesforce_crm(districts, 420)
    product_rows = create_product_usage(districts, 420)
    billing_rows = create_contract_billing(districts, 240)

    canonical_accounts_rows = canonical_accounts(districts, salesforce_rows)
    canonical_contacts_rows = canonical_contacts(salesforce_rows)
    canonical_product_rows = canonical_customer_product_view(districts, salesforce_rows, product_rows, billing_rows)
    mapping_rows = source_to_golden_mapping(salesforce_rows, product_rows, billing_rows)

    files = {
        '/mnt/data/salesforce_crm.csv': salesforce_rows,
        '/mnt/data/product_usage.csv': product_rows,
        '/mnt/data/contract_billing.csv': billing_rows,
        '/mnt/data/canonical_accounts.csv': canonical_accounts_rows,
        '/mnt/data/canonical_contacts.csv': canonical_contacts_rows,
        '/mnt/data/canonical_customer_product_view.csv': canonical_product_rows,
        '/mnt/data/source_to_golden_mapping.csv': mapping_rows,
    }
    for path, rows in files.items():
        write_csv(path, rows)
    summary = [{"file_name": path.split('/')[-1], "row_count": len(rows)} for path, rows in files.items()]
    write_csv('/mnt/data/file_row_counts.csv', summary)

if __name__ == '__main__':
    main()
