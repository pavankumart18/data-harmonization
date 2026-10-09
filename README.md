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
