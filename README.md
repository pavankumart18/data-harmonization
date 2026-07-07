# Data Harmonization Tower

A live interactive demo that shows how messy, fragmented source data from multiple systems can be ingested, canonicalized, AI self-healed, and unified into a single trusted golden record — in under 2 minutes.

## What It Does

Three end-to-end demo scenarios walk through a 5-stage pipeline:

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

### Scenario 2 · Education CRM — Imagine Learning
- **Problem:** 6 sales reps entered "Houston ISD" 8 different ways across Salesforce, NetSuite, and product telemetry — creating phantom duplicate accounts
- **Result:** 35 source records → 8 golden district records, $463K in previously invisible ARR attributed
- **Key issues resolved:** entity deduplication across 3 systems, ARR reconciliation, district name normalization

### Scenario 3 · Beverage Distribution — Swire Repeat Order Intelligence
- **Problem:** The same outlets and SKUs live under different IDs across ERP/CONA, CRM, TMS routing, inventory, POD logs, and the promo file — so no system can tell what an outlet normally reorders, and reps rebuild every order by hand
- **Result:** 9 operational files (~250K source rows, 114 sampled) → 1 golden Outlet-SKU repeat-order dataset; 42% of pairs auto-prefill ready, 31% routed to sales review, 27% correctly held back
- **Key issues resolved:** duplicate outlet merge (Walmart #1482 / Wal-Mart 1482 / WM Supercenter 1482), legacy-vs-new SKU merge (KOZ12PK → Coca-Cola Zero Sugar 12pk), UOM conversion to cases (EA / Pallet / CS), route ID normalization (SLC-27 / SaltLake_027 → R27), delivery window parsing, sales-rep inference from territory files, promo-spike suppression
- **Data:** hand-authored synthetic dataset in `swire_data.js`, generated per the "Swire Repeat Order Intelligence — Synthetic Data Generation Context" brief (demo-only, no real Swire data)

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
├── icons.js         # Lucide-style SVG icon definitions
└── styles.css       # Full design system (components, utilities)
```

## Tech Stack

- **Vanilla JS** — no framework, no build tooling
- **CSS custom properties** — dark theme design system with accent, emerald, amber, danger tokens
- **Inline SVG icons** — Lucide-style, rendered via `icon(name, sizeClass)` helper
- **Override chain pattern** — page renderers are progressively enhanced via `const _prev = renderX; renderX = function() { ... }` so scenario-specific logic layers cleanly over the base app
