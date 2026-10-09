# Data Harmonization Tower

A live interactive demo that shows how messy, fragmented source data from multiple systems can be ingested, canonicalized, AI self-healed, and unified into a single trusted golden record — in under 2 minutes.

## What It Does

Four end-to-end demo scenarios walk through a 5-stage pipeline:

| Stage | Description |
|-------|-------------|
| **1 · Ingest & Profile** | Load raw source files and auto-scan every column for missing values, format inconsistencies, language mismatches, and naming conflicts |
| **2 · Canonicalize** | Map supplier-specific column names (in multiple languages) to a single canonical schema using AI |
| **3 · AI Self-Heal** | Detect issue categories (normalization, matching, enrichment, validation, language) and propose confidence-scored fixes for human approval |
| **4 · Golden Record** | Deduplicate all source records into canonical golden records with full lineage tracing |
| **5 · Business Impact** | Side-by-side before/after search demo showing zero-result queries eliminated and ARR recovered |

## Scenarios

### Scenario 1 · Life Sciences — SKU / Product Catalog
- **Problem:** 4 supplier feeds (US, EU, Nordic, Legacy PIM) describe the same antibodies and reagents with different SKU codes, languages, spellings, and units
- **Result:** 64 raw source records → 6 canonical golden SKUs, 91% dedup ratio, 3 currencies unified, 7 language variants resolved
- **Key issues resolved:** synonym normalization (FC/FACS/Flow Cytometry), cross-catalog product matching, missing field enrichment (target protein), decimal format validation (European `389,50` → float), species language mapping

### Scenario 2 · Education CRM — K-12 District Accounts
- **Problem:** 6 sales reps entered "Houston ISD" 8 different ways across Salesforce, NetSuite, and product telemetry — creating phantom duplicate accounts
- **Result:** 35 source records → 8 golden district records, $463K in previously invisible ARR attributed
- **Key issues resolved:** entity deduplication across 3 systems, ARR reconciliation, district name normalization

### Scenario 3 · Beverage Distribution — Repeat Order Intelligence
- **Problem:** The same outlets and SKUs live under different IDs across ERP/CONA, CRM, TMS routing, inventory, POD logs, and the promo file — so no system can tell what an outlet normally reorders, and reps rebuild every order by hand
- **Result:** 9 operational files (~250K source rows, 114 sampled) → 1 golden Outlet-SKU repeat-order dataset; 42% of pairs auto-prefill ready, 31% routed to sales review, 27% correctly held back
- **Key issues resolved:** duplicate outlet merge (Walmart #1482 / Wal-Mart 1482 / WM Supercenter 1482), legacy-vs-new SKU merge (KOZ12PK → Coca-Cola Zero Sugar 12pk), UOM conversion to cases (EA / Pallet / CS), route ID normalization (SLC-27 / SaltLake_027 → R27), delivery window parsing, sales-rep inference from territory files, promo-spike suppression
- **Data:** hand-authored synthetic dataset in `swire_data.js`, generated per a repeat-order intelligence data-generation brief (demo-only, no real customer data)

### Scenario 4 · Medical Technology — Installed Base & Receivables
- **Problem:** ten independent extracts (Reltio MDM, SAP/JDE accounts, Salesforce accounts/contacts/contracts, install base, movements, field service, SAP orders, billing & AR) describe the same hospitals and devices with different IDs, names and locations
- **Built from data, not scripted:** an offline Python + DuckDB pipeline profiles the raw zip, runs 10 versioned SQL transformations, scores facility matches, builds an asset identifier index and an evidence timeline per device, groups findings into a review queue, and computes invoice-level AR exposure
- **Screens:** Sources (RAG by completeness / validity / consistency / linkability, raw rows, issue register) → Map (field map, relationship diagram with pan/zoom, SQL drawer, apply run) → Review (normalization / identity / relationship / unresolved queues with reversible, exportable decisions) → Golden (connected facility view with crosswalk and lineage) → Impact (what changed, where problems concentrate, open AR associated with an issue, owners and next actions)
- **Data:** `282_BD_MMS_Rebuilt_Raw_Source_Data.zip` (illustrative BD-style demo data); requirements in `283_BD_Data_Harmonization_PRD_Revised.docx`

```bash
# regenerate the run (writes public/bd/<run_id>/*.json, public/bd/latest.json and bd_data.js)
uv run pipeline/bd_pipeline.py generate --input 282_BD_MMS_Rebuilt_Raw_Source_Data.zip --output public/bd
# acceptance tests (counts, SQL execution, determinism, AR reconciliation, decision replay)
uv run --with duckdb --with pytest pytest pipeline/tests -q
# replay exported reviewer decisions
uv run pipeline/bd_pipeline.py generate --input 282_BD_MMS_Rebuilt_Raw_Source_Data.zip --output public/bd --decisions review_decisions.json
```
Served over HTTP the page fetches and validates the run folder (a manifest blocks mismatched generations); opened from disk, or if the run is unavailable, it falls back to the bundled copy in `bd_data.js` and says so on screen.

#### Scenario 4 default story (simplification PRD)
Each screen answers one question; the full technical views stay one click away (Back to summary returns).

| Page | Question | Default view | Secondary view |
|------|----------|--------------|----------------|
| raw | Where are the data breaks? | 3 problem areas (ownership, orders & contracts, billing & payer), compact source list, top issues | All findings: 4-dimension quality bars, thresholds, profiles, raw rows, issue register |
| mapping | What relationships break? | Customer → Facility → Asset → Order → Contract → Invoice with joined / review / unresolved counts; 3 biggest breaks | Inspect mapping: field map, canonical model, ER diagram, SQL drawer; Apply mappings |
| workbench | Where is judgment needed? | 3 cases picked deterministically (facility identity, asset move, contract entitlement; next highest priority if missing) with decide / undo | Full review queue, filters, export / import / reset |
| golden | What does a trusted view show? | One asset (EA-00003 when present) on a dated timeline; disputed site and proposed next correction; confirmed vs candidate links | Facility browser, crosswalk, lineage, orders & contracts |
| search | What should BD act on? | Receivables to investigate (associated open AR, ≤3 buckets, uncorroborated notes kept separate), then the ranked CDE backlog | Explore AR (aging, facilities, invoice paths); Supporting analysis (before/after metrics, concentration, owner corrections) |

**CDE backlog** (`bdCdeBacklog()` in `bd.js`, recomputed from the run and the current review state):

| CDE | Rules | Review item types | Linked AR categories |
|-----|-------|-------------------|----------------------|
| CDE-01 Owning ERP customer / account | C-06-OWNER, R-06-OWNER | owner ERP number | none |
| CDE-02 Asset → current facility | F-ASSET-LOC, C-06-SITE, C-07-DEST | asset location, movement destination | asset_relationship |
| CDE-03 Order → facility (sold-to) | B-ORDER-LOC, S-ORDER-SYS, S-ORDER-ROLE, C-09-SHIPTO | order system | asset_relationship, system_mismatch |
| CDE-04 Contract / entitlement | B-ENTITLE-01, B-PO-01, C-05-ACCT, C-05-END, R-05-ACCT | entitlement, contract account | entitlement |
| CDE-05 Invoice payer / customer | C-10-PAYER, C-09-PAYER, B-PAYER-01, V-AR-STATUS | invoice payer, payer conflict, status / amount | payer_gap |
| CDE-06 Canonical facility identity / name | U-DUP-ENTITY, S-NAME, S-ADDR, U-02-NATIVE, R-01/R-02/C-01/C-02 parent, C-01-DHC, C-04-STREET | identity matches, name variants, hierarchy, healthcare ID | none |
| CDE-07 Asset serial & UDI | V-SERIAL, C-06-UDI, R-07/R-08/R-09-ASSET, C-07-IDS, C-08-IDS, C-09-SERIAL | serial format, service device | identifier_defect |

- affected_count = distinct source rows with a non-informational finding; a denominator is shown only when all findings come from one extract.
- linked_open_ar_usd = distinct open invoices whose evidence categories match the CDE. Rows are not additive: one invoice can touch several CDEs.
- Ranking (v1, no weighted score): linked open AR desc → open high-severity review items → relationships with review/unresolved rows → open review items → CDE id. The reason label states which key placed the row.
- Proposed owner = the most common steward on the CDE's review items, labeled "suggested steward"; "Owner to assign" when none.

**Change log (simplification)**
- `bd.js`: new default renderers `bdRenderSources`, `bdRenderMap`, `bdRenderReview`, `bdRenderGolden`, `bdRenderImpact`; previous renderers kept as `bd*Full` behind `bdSetFull()`; added `bdProblemAreas`, `bdChain`, `bdCuratedCases`, `bdStoryFacts`, `bdAssetEvents`, `bdCdeBacklog`, `bdExploreAr`; source drill-down now carries the 4-dimension bars; 11-step demo replaced by a 7-stop `bdDemoScript()` whose narration is built from the active run, with Pause / Resume.
- `bd.css`: story-view layout (problem cards, relationship chain, case cards, horizontal timeline, AR hero, CDE table).
- Pipeline, generated data and the other three scenarios are unchanged. Screenshots: `docs/screenshots/before/` and `docs/screenshots/after/`.

**Data limitations in this snapshot:** payer-conflict and "relationship under review" collection notes are not corroborated by the extracts and are reported separately; CDE-01 (owner) and CDE-06 (facility identity) have no evidence-linked AR; contract inference for CTR-ASC-004 / CTR-ASC-010 stays a review proposal, so their orders show no entitlement until approved.

## Running Locally

No build step required. This is a pure vanilla JS single-page app.

```bash
# Clone and open directly in a browser
open index.html
```

Or serve with any static file server:

```bash
npx serve .
# or
python -m http.server 8080
```

## File Structure

```
├── index.html       # App shell
├── app.js           # All application logic, page renders, demo overrides
├── data.js          # Scenario 1 + 2 source data, harmonization issues, golden records
├── swire_data.js    # Scenario 3 synthetic dataset (9 source files, golden Outlet-SKU records)
├── swire.js         # Scenario 3 page renderers (loaded after app.js, override-chain pattern)
├── bd.js / bd.css   # Scenario 4 renderers, loader, review state
├── bd_data.js       # Scenario 4 bundled run (generated)
├── pipeline/        # Scenario 4 pipeline: bd_pipeline.py, sql/*.sql, tests/
├── public/bd/       # Scenario 4 versioned run outputs (generated)
├── icons.js         # Lucide-style SVG icon definitions
└── styles.css       # Full design system (components, utilities)
```

## Tech Stack

- **Vanilla JS** — no framework, no build tooling
- **CSS custom properties** — dark theme design system with accent, emerald, amber, danger tokens
- **Inline SVG icons** — Lucide-style, rendered via `icon(name, sizeClass)` helper
- **Override chain pattern** — page renderers are progressively enhanced via `const _prev = renderX; renderX = function() { ... }` so scenario-specific logic layers cleanly over the base app
