// ============================================================
//  Raw Data — Embedded from the /raw folder
//  Auto-profiled with quality metrics
// ============================================================

const RAW_FILES = {
  'supplier_feed_us_antibodies.csv': {
    type: 'csv', source: 'US Supplier Feed', rows: 4320, region: 'US',
    description: 'US-based antibody & reagent catalog from 4 suppliers',
    headers: ['supplier_name','supplier_sku','supplier_product_name','target','host_species','reactivity','application','clone','conjugate','size','size_unit','price_usd','currency','availability_status','lead_time_days','datasheet_id','ruo_flag','description'],
    data: [
      ['BioAxis','BA-100245','Anti-CD20 Monoclonal Antibody','CD20','Mouse','Human','FC','2H7','FITC','100','uL','449.00','USD','In Stock','5','ds_001','Y','Validated for flow cytometry on human PBMC samples'],
      ['BioAxis','BA-100246','Anti-CD20 Monoclonal Antibody','CD20','Mouse','Human','Flow Cytometry','2H7','PE','100','uL','465.00','USD','In Stock','6','ds_002','Y','PE conjugated variant for human samples'],
      ['BioAxis','BA 100245 XL','Anti CD20 mAb','CD-20','Mouse','Hu','FACS','2H7','Fitc','0.5','mL','1799.00','USD','In Stock','7','ds_003','Y','Same clone, larger pack size'],
      ['ImmunoPeak','IP-CD3-FITC-100','Anti-CD3 antibody, clone UCHT1','CD3','Mouse','Human','FC','UCHT1','FITC','100','uL','329.00','USD','In Stock','4','ds_004','Y','Flow cytometry reagent for whole blood'],
      ['ImmunoPeak','IP-CD3-NA-100','Anti-CD3 antibody, clone UCHT1','CD3','Mouse','Human','Flow','UCHT1','No conjugate','100','uL','289.00','USD','Low Stock','9','ds_005','Y','Unconjugated format'],
      ['LabVeritas','LV-GAPDH-RB-100','GAPDH Rabbit Polyclonal Antibody','GAPDH','Rabbit','Human, Mouse','WB','','','100','uL','210.00','USD','In Stock','3','ds_006','Y','Validated in western blot'],
      ['LabVeritas','LV-BCA-500','BCA Protein Assay Kit','','','','Protein Quantification','','','500','tests','189.00','USD','In Stock','5','ds_007','Y','Colorimetric protein quantification kit'],
      ['CytoNova','CN-IL2-REC-10UG','Recombinant Human IL-2 Protein','IL2','','Human','Cell Culture','','','10','ug','145.00','USD','In Stock','8','ds_008','Y','Carrier free recombinant human IL-2'],
      ['CytoNova','CN-TNF-ELISA-96','TNF-alpha ELISA Kit','TNF-alpha','','Human','ELISA','','HRP','96','wells','520.00','USD','In Stock','12','ds_009','Y','Sandwich ELISA for serum and plasma'],
      ['CytoNova','CN-TNF-ELISA-96-DX','TNF alpha ELISA Kit','TNFα','','Human','ELISA','','HRP','96','tests','548.00','USD','Backorder','21','ds_010','N','Diagnostic use labeling under evaluation'],
      ['BioAxis','BA-PBMC-001','Human PBMC, Cryopreserved','','','Human','Cell Assay','','','10','vials','690.00','USD','In Stock','2','ds_011','Y','Healthy donor PBMC, cryopreserved'],
      ['CytoNova','CN-HELA-LYSATE','HeLa Cell Lysate','','','Human','WB','','','100','ug','125.00','USD','Discontinued','0','ds_012','Y','Whole cell lysate from HeLa line'],
    ],
    issues: [
      { col: 'supplier_sku', type: 'format', desc: 'Inconsistent SKU format: "BA 100245 XL" uses spaces instead of hyphens', severity: 'high', row: 2 },
      { col: 'target', type: 'normalization', desc: '"CD-20" vs "CD20" — inconsistent hyphenation', severity: 'high', row: 2 },
      { col: 'reactivity', type: 'abbreviation', desc: '"Hu" used instead of "Human"', severity: 'medium', row: 2 },
      { col: 'application', type: 'synonym', desc: '"FC" / "Flow Cytometry" / "FACS" / "Flow" — 4 variants for same concept', severity: 'high', rows: [0,1,2,4] },
      { col: 'conjugate', type: 'normalization', desc: '"Fitc" vs "FITC" — inconsistent casing', severity: 'medium', row: 2 },
      { col: 'target', type: 'encoding', desc: '"TNFα" uses unicode α vs "TNF-alpha" ASCII', severity: 'medium', row: 9 },
      { col: 'size_unit', type: 'normalization', desc: '"uL" vs "mL" vs "wells" vs "tests" — mixed units require normalization', severity: 'medium' },
      { col: 'availability_status', type: 'vocabulary', desc: '"Discontinued" product still in active feed', severity: 'low', row: 11 },
      { col: 'target', type: 'missing', desc: '3 rows have empty target field', severity: 'medium' },
      { col: 'clone', type: 'missing', desc: '5 rows have empty clone field', severity: 'low' },
    ]
  },

  'supplier_feed_eu_reagents.csv': {
    type: 'csv', source: 'EU Supplier Feed', rows: 2850, region: 'EU',
    description: 'European reagent catalog with German/French field names',
    headers: ['vendor','product_code','product_title_local','product_title_english','anwendung','spezies','zielprotein','packung','preis_eur','waehrung','lagerstatus','beschreibung','ce_ivd','research_only','country_market'],
    data: [
      ['EuroLab','EL-7782','Anti-CD20 Antikorper','Anti-CD20 Antibody','Durchflusszytometrie','Mensch','','100 uL','389,50','EUR','Lagernd','Fur humane Proben validiert, Klon 2H7, FITC','N','Y','DE'],
      ['EuroLab','EL-7783','Anti-CD20 Antikorper PE','Anti-CD20 Antibody PE','FACS','Human','CD20','100ul','402,00','EUR','Lagernd','PE konjugiert fur Flow Cytometry','N','Y','DE'],
      ['NordAssay','NA-IL6-96','IL-6 ELISA Kit','IL-6 ELISA Kit','ELISA','Human','IL6','96 Tests','520,00','EUR','2 Wochen','Sandwich ELISA fur Serum und Plasma','N','Y','DE'],
      ['NordAssay','NA-TNF-96','TNF-alpha ELISA Kit','TNF alpha ELISA Kit','ELISA','Human','TNF-alpha','1 x 96 wells','495,00','EUR','1 Woche','Geeignet fur Serum, Plasma','N','Y','DE'],
      ['EuroLab','EL-CD3-FITC','CD3 Antikorper FITC','Anti-CD3 FITC Antibody','Cytometrie en flux','Homme','CD3','0,1 mL','299,00','EUR','Lagernd','Klon UCHT1, fur Vollblut','N','Y','FR'],
      ['BioGnostics','BG-GAPDH-100','GAPDH Antikorper','Anti-GAPDH Antibody','Western Blot','Human, Maus','GAPDH','100 uL','199,00','EUR','Lagernd','Kaninchen polyklonal','N','Y','DE'],
      ['BioGnostics','BG-BCA-500','BCA Protein Assay Kit','BCA Protein Assay Kit','Proteinbestimmung','','','500 Tests','175,00','EUR','Lagernd','Colorimetrische Bestimmung','N','Y','DE'],
      ['EuroLab','EL-PBMC-10','PBMC kryokonserviert','Human PBMC Cryopreserved','Cell Assay','Human','','10 Vials','640,00','EUR','3 Wochen','Gesunder Spender','N','Y','DE'],
      ['NordAssay','NA-IL2-10UG','Rekombinantes humanes IL-2','Recombinant Human IL-2','Cell culture','Human','IL-2','10 ug','132,00','EUR','Lagernd','Carrier-free protein','N','Y','DE'],
      ['EuroLab','EL-HELA-LYS','HeLa Zelllysat','HeLa Cell Lysate','WB','Human','','100 ug','119,00','EUR','Abgekundigt','Gesamtzelllysat aus HeLa','N','Y','DE'],
    ],
    issues: [
      { col: 'anwendung', type: 'language', desc: 'Mixed languages: "Durchflusszytometrie" (DE), "Cytometrie en flux" (FR), "FACS" (EN)', severity: 'high' },
      { col: 'spezies', type: 'language', desc: '"Mensch" (DE) / "Homme" (FR) / "Human" (EN) — 3 languages for same species', severity: 'high' },
      { col: 'preis_eur', type: 'format', desc: 'European comma decimal separator: "389,50" instead of "389.50"', severity: 'medium' },
      { col: 'packung', type: 'format', desc: 'Mixed size formats: "100 uL", "100ul", "0,1 mL", "96 Tests", "1 x 96 wells"', severity: 'high' },
      { col: 'lagerstatus', type: 'language', desc: 'German status: "Lagernd", "2 Wochen", "Abgekundigt" — not standardized', severity: 'medium' },
      { col: 'zielprotein', type: 'missing', desc: '4 rows have empty target protein field', severity: 'medium' },
    ]
  },

  'acquisition_catalog_nordic.csv': {
    type: 'csv', source: 'Nordic Acquisition', rows: 1440, region: 'Nordic',
    description: 'Recently acquired Nordic subsidiary catalog with Swedish/Danish fields',
    headers: ['acq_entity','local_sku','bezeichnung','kategori','anvandning','vardorganism','reaktivitet','storlek','pris_local','currency','supplier_ref','active_flag','free_text_spec','erp_system','source_country'],
    data: [
      ['NordBio Sweden','NB-44321','CD20 antikropp FITC','Antikroppar','Flodescytometri','Mus','Human','0.1 mL','410.00','SEK','BA100245','1','Clone 2H7 for human FC','JeevesERP','SE'],
      ['NordBio Sweden','NB-44322','CD20 antikropp PE','Antikroppar','Flodescytometri','Mus','Human','100 uL','425.00','SEK','BA-100246','1','PE conjugated clone 2H7','JeevesERP','SE'],
      ['NordBio Sweden','NB-51010','IL6 ELISA-kit','ELISA','ELISA','','Human','96 brunnar','565.00','SEK','NAIL696','1','Serum och plasma','JeevesERP','SE'],
      ['NordBio Sweden','NB-51020','TNF alfa ELISA kit','ELISA','ELISA','','Human','96 brunnar','535.00','SEK','NA-TNF-96','1','For serum/plasma use','JeevesERP','SE'],
      ['NordBio Sweden','NB-30010','CD3 antikropp FITC','Antikroppar','Flodescytometri','Mus','Manniska','100 ul','345.00','SEK','IP-CD3-FITC-100','1','UCHT1 clone','JeevesERP','SE'],
      ['NordBio Denmark','ND-7001','GAPDH antistof','Antistoffer','Western blot','Kanin','Human, mus','100 uL','155.00','DKK','LV-GAPDH-RB-100','1','Polyclonal, cell lysate validated','Navision','DK'],
      ['NordBio Denmark','ND-8002','BCA protein assay kit','Proteinanalyse','Protein kvantificering','','','500 test','1295.00','DKK','BG-BCA-500','1','Colorimetric assay kit','Navision','DK'],
      ['NordBio Sweden','NB-9901','HeLa celllysat','Cellbiologi','WB','','Human','100 ug','135.00','SEK','CN-HELA-LYSATE','1','Legacy stock from prior supplier','JeevesERP','SE'],
    ],
    issues: [
      { col: 'bezeichnung', type: 'language', desc: 'Swedish product names: "antikropp", "celllysat", "antistof" (Danish)', severity: 'high' },
      { col: 'anvandning', type: 'language', desc: '"Flodescytometri" (SE), "Protein kvantificering" (SE), "WB" (EN) — mixed languages', severity: 'high' },
      { col: 'reaktivitet', type: 'normalization', desc: '"Manniska" (Swedish for Human) vs "Human" in same column', severity: 'high', row: 4 },
      { col: 'currency', type: 'multi-currency', desc: 'Mixed currencies SEK/DKK — not normalized to EUR or USD', severity: 'medium' },
      { col: 'supplier_ref', type: 'format', desc: '"BA100245" (no hyphens) vs "BA-100246" — inconsistent cross-references', severity: 'medium', row: 0 },
      { col: 'storlek', type: 'language', desc: '"brunnar" (Swedish for wells), "test" — not standardized', severity: 'medium' },
    ]
  },

  'customer_search_logs.csv': {
    type: 'csv', source: 'Search Logs', rows: 35000, region: 'Global',
    description: 'Customer search queries with click-through data and zero-result flags',
    headers: ['search_date','country','raw_query','clicked_product_id','clicked_supplier_sku','search_result_count','zero_result_flag','session_id','customer_segment'],
    data: [
      ['2026-02-03','DE','anti cd20 human flow','EB-0001','BA100245','3','0','S001','Academic'],
      ['2026-02-03','SE','cd20 fitc 2h7','EB-0014','NB-44321','1','0','S002','Biopharma'],
      ['2026-02-04','DE','anti il6 serum elisa','','','0','1','S003','Academic'],
      ['2026-02-04','FR','cytometrie en flux cd3 fitc','EB-0004','EL-CD3-FITC','2','0','S004','Hospital'],
      ['2026-02-05','DE','hela lysate wb control','EB-0013','EL-HELA-LYS','1','0','S005','Biopharma'],
      ['2026-02-05','DE','tnf alpha diagnostic elisa','EB-0008','CN-TNF-ELISA-96','2','0','S006','Hospital'],
      ['2026-02-06','DE','human pbmc cryopreserved','EB-0012','BA-PBMC-001','4','0','S007','Academic'],
      ['2026-02-06','DE','cluster of differentiation 20 antibody','','','0','1','S008','Biopharma'],
      ['2026-02-07','SE','flodescytometri cd20 antikropp','EB-0014','NB-44321','1','0','S009','Academic'],
      ['2026-02-08','DE','protein quantification bca kit 500','EB-0007','LV-BCA-500','5','0','S010','Biopharma'],
    ],
    issues: [
      { col: 'zero_result_flag', type: 'search-gap', desc: '2 of 10 searches returned zero results — data gaps', severity: 'high' },
      { col: 'raw_query', type: 'language', desc: 'Queries in multiple languages: "cytometrie en flux" (FR), "flodescytometri" (SE)', severity: 'medium' },
      { col: 'clicked_product_id', type: 'missing', desc: 'Empty for zero-result searches — lost revenue opportunities', severity: 'high' },
    ]
  },

  'pricing_and_inventory_snapshot.csv': {
    type: 'csv', source: 'Pricing/Inventory', rows: 8600, region: 'Global',
    description: 'Cross-supplier pricing and inventory status snapshot',
    headers: ['supplier_name','supplier_sku','internal_product_id','country','price_local','currency','inventory_status','lead_time_days','min_order_qty','last_feed_timestamp','discontinued_flag'],
    data: [
      ['BioAxis','BA-100245','EB-0001','DE','389.50','EUR','In Stock','5','1','2026-02-01T05:00:00','N'],
      ['EuroLab','EL-7782','EB-0001','DE','389.50','EUR','Lagernd','2','1','2026-01-29T06:00:00','N'],
      ['NordBio Sweden','NB-44321','EB-0014','SE','410.00','SEK','Available','4','1','2026-02-02T04:00:00','N'],
      ['BioAxis','BA-100246','EB-0003','US','465.00','USD','In Stock','6','1','2026-02-01T05:00:00','N'],
      ['EuroLab','EL-7783','EB-0003','DE','402.00','EUR','Lagernd','3','1','2026-01-28T06:00:00','N'],
      ['ImmunoPeak','IP-CD3-FITC-100','EB-0004','DE','319.00','EUR','In Stock','4','1','2026-02-03T05:00:00','N'],
      ['LabVeritas','LV-GAPDH-RB-100','EB-0006','DE','205.00','EUR','In Stock','3','1','2026-02-02T05:00:00','N'],
      ['BioGnostics','BG-GAPDH-100','EB-0006','DE','199.00','EUR','Lagernd','5','1','2026-01-31T06:00:00','N'],
      ['NordAssay','NA-IL6-96','EB-0010','DE','520.00','EUR','2 Wochen','14','1','2026-01-26T06:00:00','N'],
      ['CytoNova','CN-TNF-ELISA-96','EB-0008','US','520.00','USD','In Stock','12','1','2026-02-02T05:00:00','N'],
      ['CytoNova','CN-TNF-ELISA-96-DX','EB-0009','US','548.00','USD','Backorder','21','1','2026-02-02T05:00:00','N'],
      ['CytoNova','CN-HELA-LYSATE','EB-0013','DE','119.00','EUR','Discontinued','0','1','2025-10-30T05:00:00','Y'],
    ],
    issues: [
      { col: 'inventory_status', type: 'language', desc: '"Lagernd" (DE) / "Available" (SE) / "In Stock" (EN) / "2 Wochen" — 4 status vocabularies', severity: 'high' },
      { col: 'currency', type: 'multi-currency', desc: '3 currencies: EUR, USD, SEK — no normalized pricing', severity: 'medium' },
      { col: 'internal_product_id', type: 'duplicate', desc: 'EB-0001, EB-0003, EB-0006 appear from multiple suppliers — duplicate pricing rows', severity: 'medium' },
    ]
  },

  'supplier_datasheets.json': {
    type: 'json', source: 'Datasheet Metadata', rows: 1250, region: 'Global',
    description: 'Structured datasheet metadata with regulatory & citation info',
    headers: ['datasheet_id','supplier_name','supplier_sku','title','storage','intended_use','sample_type','citations_count','regulatory_text','formulation','images_present'],
    data: [
      ['ds_001','BioAxis','BA-100245','Anti-CD20 Monoclonal Antibody, Clone 2H7, FITC','2-8C','Flow cytometry','Whole blood; PBMC','12','For research use only. Not for diagnostic procedures.','PBS with 0.09% sodium azide','true'],
      ['ds_002','BioAxis','BA-100246','Anti-CD20 Monoclonal Antibody, Clone 2H7, PE','2-8C','Flow Cytometry','Whole blood; PBMC','9','For research use only.','PBS','true'],
      ['ds_003','BioAxis','BA 100245 XL','Anti CD20 mAb FITC large pack','2-8C','Flow Cytometry','PBMC','2','RUO only','PBS','false'],
      ['ds_004','ImmunoPeak','IP-CD3-FITC-100','Anti-CD3 FITC Antibody, clone UCHT1','2-8C','Flow Cytometry','Whole blood','15','For research use only','PBS BSA','true'],
      ['ds_005','ImmunoPeak','IP-CD3-NA-100','Anti-CD3 Antibody, unconjugated','2-8C','Immunostaining','Cell suspension','5','Research use only','PBS','false'],
      ['ds_006','LabVeritas','LV-GAPDH-RB-100','Rabbit polyclonal anti-GAPDH','-20C','Western blot','Cell lysate; Tissue lysate','40','For research use only','Tris buffer glycerol','true'],
      ['ds_007','LabVeritas','LV-BCA-500','BCA Protein Assay Kit','RT','Protein quantification','Cell lysate; Serum','23','Research use only','Reagent A and B','true'],
      ['ds_008','CytoNova','CN-IL2-REC-10UG','Recombinant Human IL-2 Protein','-80C','Cell culture','Cell culture media','31','RUO','Lyophilized protein','false'],
      ['ds_009','CytoNova','CN-TNF-ELISA-96','Human TNF-alpha ELISA Kit','2-8C','ELISA','Serum; Plasma','18','For research use only','Microplate kit','true'],
      ['ds_010','CytoNova','CN-TNF-ELISA-96-DX','TNF-alpha ELISA Kit Diagnostic','2-8C','ELISA','Serum; Plasma','1','CE-IVD for diagnostic procedures','Microplate kit','true'],
      ['ds_011','BioAxis','BA-PBMC-001','Human PBMC, Cryopreserved','Liquid nitrogen','Cell assay','PBMC','3','For research use only','Cell suspension in freezing medium','false'],
      ['ds_012','CytoNova','CN-HELA-LYSATE','HeLa Cell Lysate','-80C','Western blot','Cell lysate','7','Research use only','Lysis buffer','false'],
    ],
    issues: [
      { col: 'regulatory_text', type: 'normalization', desc: '5 variants: "For research use only.", "RUO only", "RUO", "Research use only", "CE-IVD..."', severity: 'medium' },
      { col: 'intended_use', type: 'synonym', desc: '"Flow cytometry" vs "Flow Cytometry" vs "Immunostaining" — casing & synonym issues', severity: 'low' },
      { col: 'storage', type: 'format', desc: 'Inconsistent temp format: "2-8C", "-20C", "-80C", "RT", "Liquid nitrogen"', severity: 'low' },
    ]
  },

  'internal_master_catalog_legacy.xlsx': {
    type: 'xlsx', source: 'Internal Legacy', rows: 5000, region: 'Global',
    description: 'Messy dump from the legacy PIM system being migrated',
    headers: ['internal_product_id', 'legacy_item_code', 'display_name', 'category_l1', 'category_l2', 'category_l3', 'brand_name', 'primary_supplier', 'primary_supplier_sku', 'secondary_supplier_sku', 'application_normalized', 'species_normalized', 'target_normalized', 'pack_description', 'base_price', 'currency', 'status', 'created_year', 'last_updated', 'completeness_score', 'notes'],
    data: [
      ['EB-0001', '1001.0', 'CD20 Antibody Human FC', 'Reagents', 'Antibody', 'Flow Cytometry', 'BioAxis', 'BioAxis', 'BA100245', 'EL-7782', 'Flow Cytometry', 'Human', 'CD20', '100 microL', '440.0', 'EUR', 'Active', '2021.0', '2025-05-12', '72.0', 'duplicate? Sweden version also exists'],
      ['EB-0002', '1002.0', 'Anti CD20 (Human) Flow Cytometry', 'Immunology Reagents', 'Antibodies', '', 'EuroLab', 'EuroLab', 'EL-7782', '', 'Flow', '', 'CD-20', '100 uL', '389.5', 'EUR', 'Active', '2020.0', '2024-11-03', '51.0', 'created from German feed'],
      ['EB-0003', '1003.0', 'CD20 Antibody PE', 'Reagents', 'Antibody', 'Flow Cytometry', 'BioAxis', 'BioAxis', 'BA-100246', 'EL-7783', 'Flow Cytometry', 'Human', 'CD20', '100 uL', '465.0', 'USD', 'Active', '2022.0', '2025-01-14', '86.0', ''],
      ['EB-0004', '1020.0', 'CD3 Antibody FITC', 'Reagents', 'Antibody', 'Flow Cytometry', 'ImmunoPeak', 'ImmunoPeak', 'IP-CD3-FITC-100', 'EL-CD3-FITC', 'Flow Cytometry', 'Human', 'CD3', '0.1 mL', '319.0', 'EUR', 'Active', '2021.0', '2025-02-10', '90.0', ''],
      ['EB-0005', '1021.0', 'CD3 Antibody Unconjugated', 'Reagents', 'Antibody', 'Flow Cytometry', 'ImmunoPeak', 'ImmunoPeak', 'IP-CD3-NA-100', '', '', 'Human', 'CD3', '100 uL', '289.0', 'USD', 'Active', '2021.0', '2024-08-22', '63.0', 'missing application normalized'],
      ['EB-0006', '1101.0', 'GAPDH Rabbit pAb', 'Molecular Biology', 'Antibody', 'WB', 'LabVeritas', 'LabVeritas', 'LV-GAPDH-RB-100', 'BG-GAPDH-100', 'Western Blot', 'Human;Mouse', 'GAPDH', '100 uL', '205.0', 'USD', 'Active', '2019.0', '2025-03-08', '88.0', ''],
      ['EB-0007', '1201.0', 'BCA Protein Assay', 'Protein Analysis', 'Kits', 'Quantification', 'LabVeritas', 'LabVeritas', 'LV-BCA-500', 'BG-BCA-500', 'Protein Quantification', '', '', '500 tests', '182.0', 'EUR', 'Active', '2018.0', '2025-02-01', '67.0', 'taxonomy old'],
      ['EB-0008', '1301.0', 'TNF alpha ELISA kit', 'Assays', 'ELISA', 'Cytokines', 'CytoNova', 'CytoNova', 'CN-TNF-ELISA-96', 'NA-TNF-96', 'ELISA', 'Human', 'TNF-alpha', '96 tests', '510.0', 'USD', 'Active', '2023.0', '2025-03-01', '84.0', '']
    ],
    issues: [
      { col: 'display_name', type: 'normalization', desc: '"Anti CD20 (Human) Flow Cytometry" vs "CD20 Antibody Human FC" — disjoint naming conventions', severity: 'high' },
      { col: 'application_normalized', type: 'synonym', desc: '"Flow Cytometry" vs "Flow" lingering in normalized column', severity: 'medium' },
      { col: 'category_l1', type: 'taxonomy', desc: 'Category "Reagents" overlaps with "Immunology Reagents" - flat hierarchy conflict', severity: 'high' }
    ]
  }
};

// ── Golden Records (harmonized output) ───────────────────
const GOLDEN_RECORDS = [
  { id: 'EB-0001', canonical_name: 'Anti-CD20 Monoclonal Antibody, Clone 2H7, FITC', target: 'CD20', host: 'Mouse', reactivity: 'Human', application: 'Flow Cytometry', clone: '2H7', conjugate: 'FITC', category: 'Antibody', suppliers: ['BioAxis','EuroLab','NordBio Sweden'], currencies: {USD:449,EUR:389.50,SEK:410}, availability: 'In Stock', ruo: true,
    _lineage: [
      { source: 'supplier_feed_us_antibodies.csv', id: 'BA-100245', note: 'Primary product definition & USD price' },
      { source: 'supplier_feed_eu_reagents.csv', id: 'EL-7782', note: 'EUR price, validated German translation' },
      { source: 'acquisition_catalog_nordic.csv', id: 'NB-44321', note: 'SEK price from Nordic subsidiary' },
    ]
  },
  { id: 'EB-0003', canonical_name: 'Anti-CD20 Monoclonal Antibody, Clone 2H7, PE', target: 'CD20', host: 'Mouse', reactivity: 'Human', application: 'Flow Cytometry', clone: '2H7', conjugate: 'PE', category: 'Antibody', suppliers: ['BioAxis','EuroLab','NordBio Sweden'], currencies: {USD:465,EUR:402,SEK:425}, availability: 'In Stock', ruo: true,
    _lineage: [
      { source: 'supplier_feed_us_antibodies.csv', id: 'BA-100246', note: 'Master definition' },
      { source: 'supplier_feed_eu_reagents.csv', id: 'EL-7783', note: 'EU localized record' },
      { source: 'acquisition_catalog_nordic.csv', id: 'NB-44322', note: 'Nordic catalog entry' },
    ]
  },
  { id: 'EB-0004', canonical_name: 'Anti-CD3 Antibody, Clone UCHT1, FITC', target: 'CD3', host: 'Mouse', reactivity: 'Human', application: 'Flow Cytometry', clone: 'UCHT1', conjugate: 'FITC', category: 'Antibody', suppliers: ['ImmunoPeak','EuroLab','NordBio Sweden'], currencies: {USD:329,EUR:299,SEK:345}, availability: 'In Stock', ruo: true,
    _lineage: [
      { source: 'supplier_feed_us_antibodies.csv', id: 'IP-CD3-FITC-100', note: 'Primary definition' },
      { source: 'supplier_feed_eu_reagents.csv', id: 'EL-CD3-FITC', note: 'French market entry' },
      { source: 'acquisition_catalog_nordic.csv', id: 'NB-30010', note: 'Swedish entry (Manniska→Human)' },
    ]
  },
  { id: 'EB-0006', canonical_name: 'Anti-GAPDH Polyclonal Antibody, Rabbit', target: 'GAPDH', host: 'Rabbit', reactivity: 'Human, Mouse', application: 'Western Blot', clone: '', conjugate: '', category: 'Antibody', suppliers: ['LabVeritas','BioGnostics','NordBio Denmark'], currencies: {USD:210,EUR:199,DKK:155}, availability: 'In Stock', ruo: true,
    _lineage: [
      { source: 'supplier_feed_us_antibodies.csv', id: 'LV-GAPDH-RB-100', note: 'Primary (40 citations)' },
      { source: 'supplier_feed_eu_reagents.csv', id: 'BG-GAPDH-100', note: 'EU alternative supplier' },
      { source: 'acquisition_catalog_nordic.csv', id: 'ND-7001', note: 'Danish catalog (DKK pricing)' },
    ]
  },
  { id: 'EB-0008', canonical_name: 'Human TNF-alpha ELISA Kit (96 wells)', target: 'TNF-alpha', host: '', reactivity: 'Human', application: 'ELISA', clone: '', conjugate: 'HRP', category: 'ELISA Kit', suppliers: ['CytoNova','NordAssay','NordBio Sweden'], currencies: {USD:520,EUR:495,SEK:535}, availability: 'In Stock', ruo: true,
    _lineage: [
      { source: 'supplier_feed_us_antibodies.csv', id: 'CN-TNF-ELISA-96', note: 'RUO version' },
      { source: 'supplier_feed_eu_reagents.csv', id: 'NA-TNF-96', note: 'EU market version' },
      { source: 'acquisition_catalog_nordic.csv', id: 'NB-51020', note: 'Nordic catalog' },
    ]
  },
  { id: 'EB-0007', canonical_name: 'BCA Protein Assay Kit (500 tests)', target: '', host: '', reactivity: '', application: 'Protein Quantification', clone: '', conjugate: '', category: 'Assay Kit', suppliers: ['LabVeritas','BioGnostics','NordBio Denmark'], currencies: {USD:189,EUR:175,DKK:1295}, availability: 'In Stock', ruo: true,
    _lineage: [
      { source: 'supplier_feed_us_antibodies.csv', id: 'LV-BCA-500', note: 'Primary definition' },
      { source: 'supplier_feed_eu_reagents.csv', id: 'BG-BCA-500', note: 'EU equivalent' },
      { source: 'acquisition_catalog_nordic.csv', id: 'ND-8002', note: 'Danish catalog' },
    ]
  },
];

// ── Search comparison data ───────────────────────────────
const SEARCH_COMPARISONS = [
  {
    id: 's1', query: 'cd20', raw_count: 8540, golden_count: 24,
    raw: [
      { source: 'US Feed', name: 'Anti-CD20 Monoclonal Antibody', sku: 'BA-100245', issues: ['FC vs Flow Cytometry'] },
      { source: 'US Feed', name: 'Anti CD20 mAb', sku: 'BA 100245 XL', issues: ['No hyphens in SKU','CD-20 target mismatch'] },
      { source: 'EU Feed', name: 'Anti-CD20 Antikorper', sku: 'EL-7782', issues: ['German name','Missing target field'] },
      { source: 'Nordic', name: 'CD20 antikropp FITC', sku: 'NB-44321', issues: ['Swedish name','Cross-ref format'] },
    ],
    golden: [
      { name: 'Anti-CD20 Monoclonal Antibody, Clone 2H7, FITC', id: 'EB-0001', target: 'CD20', application: 'Flow Cytometry', suppliers: 3, prices: '$449 / €389 / 410 SEK' },
      { name: 'Anti-CD20 Monoclonal Antibody, Clone 2H7, PE', id: 'EB-0003', target: 'CD20', application: 'Flow Cytometry', suppliers: 3, prices: '$465 / €402 / 425 SEK' },
    ],
    improvement: 'Resolved thousands of naming variants and disjoint suppliers into 24 canonical products.'
  },
  {
    id: 's2', query: 'elisa', raw_count: 12150, golden_count: 104,
    raw: [
      { source: 'US Feed', name: 'TNF-alpha ELISA Kit', sku: 'CN-TNF-ELISA-96', issues: ['TNF-alpha vs TNFα'] },
      { source: 'US Feed', name: 'TNF alpha ELISA Kit', sku: 'CN-TNF-ELISA-96-DX', issues: ['DX variant, non-RUO'] },
      { source: 'EU Feed', name: 'IL-6 ELISA Kit', sku: 'NA-IL6-96', issues: ['Price with comma decimal'] },
      { source: 'EU Feed', name: 'TNF-alpha ELISA Kit', sku: 'NA-TNF-96', issues: ['German status "1 Woche"'] },
      { source: 'Nordic', name: 'IL6 ELISA-kit', sku: 'NB-51010', issues: ['Swedish "brunnar" for wells'] },
    ],
    golden: [
      { name: 'Human TNF-alpha ELISA Kit (96 wells)', id: 'EB-0008', target: 'TNF-alpha', application: 'ELISA', suppliers: 3, prices: '$520 / €495 / 535 SEK' },
      { name: 'BCA Protein Assay Kit (500 tests)', id: 'EB-0007', target: '', application: 'Protein Quantification', suppliers: 3, prices: '$189 / €175 / 1295 DKK' },
    ],
    improvement: 'Unified target protein naming, normalized chaotic multi-currency pricing, and standardized kit sizes.'
  },
];

// ── Harmonization Issues ─────────────────────────────────
const HARMONIZATION_ISSUES = [
  {
    id: 'h1', type: 'normalization', description: 'Application field has 7 synonyms for "Flow Cytometry"',
    confidence: 0.98,
    before: { values: ['FC','Flow Cytometry','FACS','Flow','Durchflusszytometrie','Cytometrie en flux','Flodescytometri'] },
    after: { canonical: 'Flow Cytometry', mapped: 7 },
    reasoning: 'Mapped all linguistic variants (EN/DE/FR/SE) and abbreviations to canonical "Flow Cytometry" via synonym dictionary.',
    resolved: false
  },
  {
    id: 'h2', type: 'matching', description: 'BA-100245 matched across 3 regional catalogs',
    confidence: 0.95,
    before: { records: ['BA-100245 (US)','EL-7782 (EU)','NB-44321 (Nordic)'] },
    after: { golden_id: 'EB-0001', name: 'Anti-CD20 Monoclonal Antibody, Clone 2H7, FITC' },
    reasoning: 'Cross-referenced supplier_ref fields, matched on clone (2H7) + target (CD20) + conjugate (FITC). High confidence due to 3-field match.',
    resolved: false
  },
  {
    id: 'h3', type: 'enrichment', description: 'Missing target protein inferred from product name & datasheet',
    confidence: 0.88,
    before: { product: 'Anti-CD20 Antikorper', zielprotein: '(empty)' },
    after: { zielprotein: 'CD20' },
    reasoning: 'Extracted "CD20" from product title "Anti-CD20 Antikorper" and confirmed via datasheet ds_001 keywords array.',
    resolved: false
  },
  {
    id: 'h4', type: 'validation', description: 'European price format: comma decimals → standard float',
    confidence: 0.99,
    before: { preis_eur: '389,50' },
    after: { price_eur: 389.50 },
    reasoning: 'Detected European comma decimal (country_market=DE). Converted "389,50" to float 389.50.',
    resolved: false
  },
  {
    id: 'h5', type: 'normalization', description: 'Species field: 6 language variants for "Human"',
    confidence: 0.97,
    before: { values: ['Human','Hu','Mensch','Homme','Manniska','human'] },
    after: { canonical: 'Human', mapped: 6 },
    reasoning: 'Language detection identified DE/FR/SE variants. All map to canonical "Human" with 97% confidence.',
    resolved: false
  },
];

// ── Demo Script (Auto-Play Steps) ────────────────────────
const DEMO_SCRIPT = [
  { page: 'raw', highlight: '.stats-grid', action: null,
    narration: 'Welcome to the <strong>Data Harmonization Tower</strong>. We\'re looking at <strong>7 raw data sources</strong> from 4 regions — US, EU, Nordic, and Global. Together they hold <em>over 58,000 records</em> with <strong>thousands of critical data quality issues</strong>.', stepLabel: 'Step 1 of 12 — Raw Data Overview', duration: 5500 },
  { page: 'raw', highlight: '.source-file-card:nth-child(1)', action: () => { selectFile('supplier_feed_us_antibodies.csv'); },
    narration: 'Clicking into the <strong>US antibody feed</strong> — notice the auto-profiled columns. The <em>application field</em> alone has 4 synonyms: "FC", "Flow Cytometry", "FACS", and "Flow". This is typical supplier chaos.', stepLabel: 'Step 2 of 12 — Profiling US Feed', duration: 6000 },
  { page: 'raw', highlight: '.source-file-card:nth-child(2)', action: () => { selectFile('supplier_feed_eu_reagents.csv'); },
    narration: 'Now the <strong>EU feed</strong> — field names are in German: "anwendung", "spezies", "preis_eur". Prices use comma decimals (<strong>389,50</strong> instead of 389.50). Species appears as "Mensch" and "Homme" alongside "Human".', stepLabel: 'Step 3 of 12 — EU Feed Chaos', duration: 6000 },
  { page: 'raw', highlight: '.source-file-card:nth-child(3)', action: () => { selectFile('acquisition_catalog_nordic.csv'); },
    narration: 'The <strong>Nordic acquisition catalog</strong> — recently acquired subsidiary with Swedish field names. "Manniska" means Human, "brunnar" means wells. Mixed currencies (SEK/DKK) and no normalized pricing.', stepLabel: 'Step 4 of 12 — Nordic Acquisition', duration: 5500 },
  { page: 'mapping', highlight: '.canonical-item', action: null,
    narration: 'Now we define a <strong>universal canonical schema</strong> — 8 standardized fields that every product must conform to. This is the golden target structure.', stepLabel: 'Step 5 of 12 — Canonical Schema', duration: 4500 },
  { page: 'mapping', highlight: '.table-wrapper tbody tr:nth-child(3)', action: () => { state.autoMapped = true; renderAll(); },
    narration: 'AI <strong>Auto-Map</strong> identifies which columns from each source map to which canonical fields. Note: "anwendung" (DE), "anvandning" (SE), and "application" (EN) all map to the same canonical field at <em>78% confidence</em>.', stepLabel: 'Step 6 of 12 — Auto-Mapping', duration: 5500 },
  { page: 'workbench', highlight: '.tabs-nav', action: null,
    narration: 'The <strong>Self-Healing Workbench</strong> — AI has identified 5 resolvable issues. Each shows a before/after transformation with an explanation. Let\'s look at the most impactful one...', stepLabel: 'Step 7 of 12 — Self-Healing Engine', duration: 4500 },
  { page: 'workbench', highlight: '.diff-grid', action: () => { state.activeIssueTab = 'normalization'; selectIssue('h1'); },
    narration: '<strong>7 synonyms for "Flow Cytometry"</strong> across 4 languages. The AI maps FC → FACS → Durchflusszytometrie → Cytometrie en flux → Flödescytometri, all to one canonical value. <em>98% confidence.</em>', stepLabel: 'Step 8 of 12 — Synonym Resolution', duration: 6000 },
  { page: 'workbench', highlight: '.btn-emerald-outline', action: () => { fixAllHigh(); },
    narration: 'Clicking <strong>Fix All High-Confidence</strong> — all issues above 90% confidence are auto-resolved. The human-in-the-loop can still override any decision. This is <em>self-healing with guardrails</em>.', stepLabel: 'Step 9 of 12 — Batch Resolution', duration: 5000 },
  { page: 'golden', highlight: '.lineage-timeline', action: () => { state.selectedRecordId = 'EB-0001'; renderAll(); },
    narration: 'The full source footprint still spans <em>58,460 raw rows</em>, but this searchable demo slice reduces <strong>50 sampled product rows into 6 canonical golden records</strong> — an <strong>88% merge reduction</strong>. Each golden record traces lineage back to multiple source files. Here\'s the Anti-CD20 antibody: merged from US, EU, and Nordic catalogs.', stepLabel: 'Step 10 of 12 — Golden Dataset', duration: 7000 },
  { page: 'search', highlight: '.search-result:nth-child(1)', action: () => { state.searchQuery = 'cd20'; state.isGolden = false; renderAll(); },
    narration: 'Search for <strong>"CD20"</strong> in <span style="color:var(--red)">raw data</span> — you get <strong>8 fragmented rows</strong> spread across source feeds, datasheets, and legacy catalog entries. The same product appears under different names, SKUs, and languages, so a scientist sees clutter instead of one clear answer.', stepLabel: 'Step 11 of 12 — Raw Search Pain', duration: 5500 },
  { page: 'search', highlight: '.revenue-card', action: () => { state.isGolden = true; renderAll(); },
    narration: 'Now toggle to <strong>Golden Records</strong> — the same "CD20" search returns <em>2 clean, canonical products</em> with multi-region pricing. This is the difference between <span style="color:var(--red)">data chaos</span> and <em>data clarity</em>. <strong>That\'s the impact.</strong>', stepLabel: 'Step 12 of 12 — The Impact', duration: 7000 },
];

// ── Healing Morph Data ───────────────────────────────────
const HEAL_MORPHS = [
  { before: 'FC', after: 'Flow Cytometry' },
  { before: 'FACS', after: 'Flow Cytometry' },
  { before: 'Durchflusszytometrie', after: 'Flow Cytometry' },
  { before: 'Cytometrie en flux', after: 'Flow Cytometry' },
  { before: 'Flodescytometri', after: 'Flow Cytometry' },
  { before: 'Mensch', after: 'Human' },
  { before: 'Homme', after: 'Human' },
  { before: 'Manniska', after: 'Human' },
  { before: '389,50', after: '389.50' },
  { before: 'CD-20', after: 'CD20' },
  { before: 'TNFα', after: 'TNF-alpha' },
  { before: 'Hu', after: 'Human' },
];

// ============================================================
//  CRM Dataset — Imagine Learning / Education CRM (Salesforce)
// ============================================================

const CRM_FILES = {
  'salesforce_crm.csv': {
    type: 'csv', source: 'Salesforce CRM', rows: 420, region: 'USA',
    description: 'K-12 school district accounts from Salesforce — account names typed differently by 6 reps',
    headers: ['crm_record_id','sf_account_id','account_name','parent_account_name','state','region','segment','account_type','owner_rep','arr_usd','seats_purchased','stage'],
    data: [
      ['CRM-10001','SF-A10001','Houston Independent School District','Houston ISD','TX','West','Charter Network','District','A. Rivera','60050','12000','Closed Won'],
      ['CRM-10002','SF-A10002','Houston ISD - Supplemental','Houston ISD - Supplemental','TX','West','charter network','District','A. Rivera','88814','300','Closed Lost'],
      ['CRM-10003','SF-A10003','Houston School District','Houston ISD','TX','West','Charter Network','District','A. Rivera','62211','800','Negotiation'],
      ['CRM-10004','SF-A10004','Houston ISD - Supplemental','Houston ISD','TX','West','Charter Network','District','A. Rivera','252043','500','Closed Won'],
      ['CRM-10009','SF-A10009','Riverview ISD','','AZ','West','Large District','District','A. Rivera','161756','12000','Closed Won'],
      ['CRM-10010','SF-A10010','Riverview ISD','Riverview ISD','AZ','West','Large District','District','A. Rivera','18440','300','Closed Won'],
      ['CRM-10011','SF-A10011','Riverview Public Schools','Riverview ISD','AZ','West','Large District','District','A. Rivera','255820','500','Closed Won'],
      ['CRM-10015','SF-A10015','Oak Valley Independent School District','Oak Valley School District','VA','South','Mid-Market District','District','A. Rivera','110254','800','Closed Won'],
      ['CRM-10016','SF-A10016','Oak Valley School District','Oak Valley School District','VA','South','Mid-Market District','District','A. Rivera','166023','12000','Closed Won'],
      ['CRM-10022','SF-A10022','Pine Hills ISD','Pine Hills Independent School District','VA','South','Large District','District','A. Rivera','85621','500','Closed Won'],
      ['CRM-10028','SF-A10028','Maple Grove ISD - Supplemental','','CA','West','Large District','District','D. Nguyen','102301','300','Closed Won'],
      ['CRM-10035','SF-A10035','Maple Grove Independent School District','','CA','West','Large District','District','D. Nguyen','48721','800','Closed Won'],
    ],
    issues: [
      { col: 'account_name', type: 'duplicate', desc: '"Houston Independent School District" / "Houston ISD - Supplemental" / "Houston School District" — same district, 4 records, $463K combined ARR hidden', severity: 'high', rows: [0,1,2,3] },
      { col: 'account_name', type: 'duplicate', desc: '"Riverview ISD" / "Riverview Public Schools" — same district, $436K combined ARR across 3 records', severity: 'high', rows: [4,5,6] },
      { col: 'account_name', type: 'duplicate', desc: '"Oak Valley Independent School District" vs "Oak Valley School District" — same entity, $276K split', severity: 'medium', rows: [7,8] },
      { col: 'account_name', type: 'duplicate', desc: '"Maple Grove ISD - Supplemental" vs "Maple Grove Independent School District" — same district split', severity: 'medium', rows: [10,11] },
      { col: 'segment', type: 'normalization', desc: '"charter network" (lowercase) vs "Charter Network" — inconsistent casing across records', severity: 'medium', rows: [1] },
      { col: 'parent_account_name', type: 'missing', desc: '3 rows have empty parent_account_name — cannot build district hierarchy', severity: 'medium' },
      { col: 'arr_usd', type: 'aggregation', desc: 'Total district ARR cannot be computed without deduplication across account_name variants', severity: 'high' },
    ]
  },
  'product_usage.csv': {
    type: 'csv', source: 'Product Telemetry', rows: 342, region: 'USA',
    description: 'Product usage telemetry — org names typed by implementation team, inconsistent with CRM',
    headers: ['usage_record_id','product_org_name','product_name','product_family','usage_month','active_teachers','active_students','weekly_sessions','usage_health_score','implementation_status','golden_customer_id'],
    data: [
      ['PU-20001','Houston Literacy Pilot','Imagine Learning PD','Professional Learning','2025-11','94','671','4467','69','Sandbox','GC0001'],
      ['PU-20003','Houston Literacy Pilot','Twig Science','Science','2025-12','168','4578','7398','87','Live','GC0001'],
      ['PU-20004','HOUSTON MATH PROGRAM','Imagine Learning PD','Professional Learning','2025-10','146','5367','1945','72','Pilot','GC0001'],
      ['PU-20006','Houston Math Program','Twig Science','Science','2025-11','58','5461','14874','67','Training','GC0001'],
      ['PU-20011','Riverview Credit Recovery','Imagine Math','Supplemental Math','2025-11','61','2917','21268','38','Live','GC0002'],
      ['PU-20013','RIVERVIEW CREDIT RECOVERY','Imagine Language & Literacy','Supplemental Literacy','2025-12','81','266','18674','75','Live','GC0002'],
      ['PU-20019','Oak Valley Math Program','Imagine Learning PD','Professional Learning','2025-11','112','3351','14318','76','Live','GC0003'],
      ['PU-20020','Oak Valley Credit Recovery','Twig Science','Science','2025-12','76','491','17346','33','Live','GC0003'],
      ['PU-20023','Pine Hills ISD','Imagine Learning PD','Professional Learning','2025-10','149','5286','20147','29','Live','GC0004'],
      ['PU-20027','Pine Hills Literacy Pilot','Courseware','Core Courseware','2025-11','99','2318','6269','90','Live','GC0004'],
      ['PU-20028','PINE_HILLS_LITERACY_PILOT','Imagine Language & Literacy','Supplemental Literacy','2025-10','60','617','20952','42','Live','GC0004'],
    ],
    issues: [
      { col: 'product_org_name', type: 'normalization', desc: '"HOUSTON MATH PROGRAM" vs "Houston Math Program" — all-caps variant for same org', severity: 'high', rows: [2] },
      { col: 'product_org_name', type: 'normalization', desc: '"RIVERVIEW CREDIT RECOVERY" vs "Riverview Credit Recovery" — all-caps variant', severity: 'high', rows: [5] },
      { col: 'product_org_name', type: 'normalization', desc: '"PINE_HILLS_LITERACY_PILOT" — underscores instead of spaces (export artifact)', severity: 'medium', rows: [10] },
      { col: 'product_org_name', type: 'matching', desc: '"Houston Literacy Pilot" / "Houston Math Program" not directly linked to CRM account "Houston ISD"', severity: 'high' },
      { col: 'usage_health_score', type: 'missing', desc: 'Scores below 50 indicate at-risk districts needing intervention — not flagged without aggregation', severity: 'medium' },
    ]
  },
  'contract_billing.csv': {
    type: 'csv', source: 'NetSuite Billing', rows: 234, region: 'USA',
    description: 'Contract and billing records from NetSuite ERP — billing customer names differ from CRM and product names',
    headers: ['billing_record_id','billing_customer_name','product_name_billing','product_family_billing','contract_start_date','contract_end_date','billing_status','invoice_amount_usd','seats_contracted','billing_country'],
    data: [
      ['BILL-30001','Houston Public Schools','Courseware','Core Courseware','2024-12-04','2027-05-21','Expired','89000','250','USA'],
      ['BILL-30002','Houston Public Schools','Courseware','Core Courseware','2024-10-13','2026-08-29','Active','39000','1500','USA'],
      ['BILL-30003','Houston Federal Programs','PL','Professional Learning','2025-07-08','2027-08-06','Invoiced','180000','2800','USA'],
      ['BILL-30004','Houston Federal Programs','StudySync','Core ELA','2024-10-21','2026-04-28','Amendment Pending','39000','750','USA'],
      ['BILL-30005','Houston ISD','Twig Science','Science','2025-03-14','2026-10-03','Active','39000','10000','USA'],
      ['BILL-30006','Riverview ISD','Imagine Math','Supplemental Math','2025-01-16','2027-08-13','Active','125000','5200','USA'],
      ['BILL-30007','Riverview ISD','Imagine Language & Literacy','Supplemental Literacy','2024-11-29','2028-04-04','Invoiced','22000','400','USA'],
      ['BILL-30008','Riverview Federal Programs','Imagine Math','Supplemental Math','2025-06-18','2026-05-24','Expired','125000','5200','USA'],
      ['BILL-30009','Oak Valley School District','PD Services','Professional Learning','2025-01-30','2027-06-20','Amendment Pending','180000','1500','USA'],
      ['BILL-30010','Oak Valley Public Schools','Imagine Language & Literacy','Supplemental Literacy','2024-08-15','2027-01-04','Expired','180000','10000','USA'],
      ['BILL-30011','Oak Valley Federal Programs','StudySync','Core ELA','2024-01-07','2026-03-09','Invoiced','255000','2800','USA'],
      ['BILL-30012','Pine Hills Independent School District Finance','Imagine Learning PD','Professional Learning','2025-06-22','2026-06-08','Active','180000','2800','USA'],
      ['BILL-30017','Maple Grove Public Schools','Courseware','Core Courseware','2025-02-14','2027-07-18','Amendment Pending','0','2400','USA'],
      ['BILL-30018','Maple Grove Public Schools','StudySync','Core ELA','2025-03-07','2027-09-30','Amendment Pending','0','1900','USA'],
      ['BILL-30019','Maple Grove Public Schools','Imagine Learning PD','Professional Learning','2025-05-22','2027-11-14','Amendment Pending','0','1200','USA'],
    ],
    issues: [
      { col: 'billing_customer_name', type: 'normalization', desc: '"Houston Public Schools" / "Houston Federal Programs" / "Houston ISD" — 3 billing names for same district', severity: 'high', rows: [0,1,2,3,4] },
      { col: 'billing_customer_name', type: 'normalization', desc: '"Riverview Federal Programs" vs "Riverview ISD" — same district, different billing name', severity: 'high', rows: [5,6,7] },
      { col: 'billing_customer_name', type: 'normalization', desc: '"Oak Valley School District" / "Oak Valley Public Schools" / "Oak Valley Federal Programs" — 3 names, same district', severity: 'high', rows: [8,9,10] },
      { col: 'billing_customer_name', type: 'normalization', desc: '"Pine Hills Independent School District Finance" — verbose name not matching CRM', severity: 'medium', rows: [11] },
      { col: 'product_name_billing', type: 'abbreviation', desc: '"PL" used instead of "Imagine Learning PD" — 2-letter code not linked to product catalog', severity: 'medium', rows: [2] },
      { col: 'product_name_billing', type: 'abbreviation', desc: '"PD Services" differs from CRM product names — breaks product-level reporting', severity: 'medium', rows: [8] },
      { col: 'billing_status', type: 'vocabulary', desc: '"Amendment Pending" / "Expired" / "Invoiced" — multiple status states, some indicate revenue at risk', severity: 'medium' },
      { col: 'invoice_amount_usd', type: 'aggregation', desc: 'Cannot compute total district spend without resolving billing name variants', severity: 'high' },
    ]
  }
};

const CRM_GOLDEN_RECORDS = [
  { id: 'GC0001', canonical_name: 'Houston ISD', legal_name: 'Houston Independent School District', industry: 'K-12 Education', hq_country: 'USA',
    source_variants: ['Houston Independent School District','Houston ISD - Supplemental','Houston School District','Houston Public Schools','Houston Federal Programs','Houston Math Program','Houston Literacy Pilot','HOUSTON MATH PROGRAM'],
    products_active: ['Imagine Learning PD','Twig Science','Courseware','StudySync'], application: 'Imagine Learning PD, Twig Science, Courseware',
    total_arr: 463118, open_pipeline: 95000, deal_count: 4, rep_count: 1,
    student_enrollment: 91196, region: 'West', segment: 'Charter Network',
    suppliers: ['Salesforce CRM','Product Telemetry','NetSuite Billing'],
    _lineage: [
      { source: 'Salesforce CRM', id: 'CRM-10001', note: 'Houston Independent School District — Closed Won, $60K ARR' },
      { source: 'Salesforce CRM', id: 'CRM-10002,10003,10004', note: '3 supplemental/variant records — combined $403K ARR' },
      { source: 'Product Telemetry', id: 'PU-20001,20003,20004,20006', note: '4 product orgs linked: Houston Literacy Pilot + Houston Math Program (casing variants)' },
      { source: 'NetSuite Billing', id: 'BILL-30001 to 30005', note: '5 billing records under 3 name variants unified under Houston ISD' },
    ]
  },
  { id: 'GC0002', canonical_name: 'Riverview ISD', legal_name: 'Riverview Independent School District', industry: 'K-12 Education', hq_country: 'USA',
    source_variants: ['Riverview ISD','Riverview Public Schools','Riverview Federal Programs','Riverview Credit Recovery','RIVERVIEW CREDIT RECOVERY'],
    products_active: ['Imagine Math','Imagine Language & Literacy'], application: 'Imagine Math, Imagine Language & Literacy',
    total_arr: 436016, open_pipeline: 72000, deal_count: 3, rep_count: 1,
    student_enrollment: 76063, region: 'West', segment: 'Large District',
    suppliers: ['Salesforce CRM','Product Telemetry','NetSuite Billing'],
    _lineage: [
      { source: 'Salesforce CRM', id: 'CRM-10009,10010,10011', note: '3 CRM records — combined $436K ARR' },
      { source: 'Product Telemetry', id: 'PU-20011,20013', note: 'Riverview Credit Recovery + RIVERVIEW CREDIT RECOVERY (all-caps variant)' },
      { source: 'NetSuite Billing', id: 'BILL-30006,30007,30008', note: 'Riverview ISD + Riverview Federal Programs unified' },
    ]
  },
  { id: 'GC0003', canonical_name: 'Oak Valley School District', legal_name: 'Oak Valley School District', industry: 'K-12 Education', hq_country: 'USA',
    source_variants: ['Oak Valley Independent School District','Oak Valley School District','Oak Valley Public Schools','Oak Valley Federal Programs','Oak Valley Math Program','Oak Valley Credit Recovery'],
    products_active: ['Imagine Learning PD','Imagine Language & Literacy','StudySync','Twig Science'], application: 'Imagine Learning PD, Imagine Language & Literacy, StudySync',
    total_arr: 276277, open_pipeline: 50000, deal_count: 2, rep_count: 1,
    student_enrollment: 101958, region: 'South', segment: 'Mid-Market District',
    suppliers: ['Salesforce CRM','Product Telemetry','NetSuite Billing'],
    _lineage: [
      { source: 'Salesforce CRM', id: 'CRM-10015,10016', note: '"Oak Valley Independent School District" + "Oak Valley School District" — $276K combined' },
      { source: 'Product Telemetry', id: 'PU-20019,20020', note: 'Oak Valley Math Program + Oak Valley Credit Recovery linked' },
      { source: 'NetSuite Billing', id: 'BILL-30009,30010,30011', note: '3 billing records under 3 name variants unified' },
    ]
  },
  { id: 'GC0004', canonical_name: 'Pine Hills ISD', legal_name: 'Pine Hills Independent School District', industry: 'K-12 Education', hq_country: 'USA',
    source_variants: ['Pine Hills ISD','Pine Hills Independent School District Finance','Pine Hills Literacy Pilot','PINE_HILLS_LITERACY_PILOT'],
    products_active: ['Imagine Learning PD','Courseware','Imagine Language & Literacy'], application: 'Imagine Learning PD, Courseware, Imagine Language & Literacy',
    total_arr: 326244, open_pipeline: 35000, deal_count: 1, rep_count: 1,
    student_enrollment: 14656, region: 'South', segment: 'Large District',
    suppliers: ['Salesforce CRM','Product Telemetry','NetSuite Billing'],
    _lineage: [
      { source: 'Salesforce CRM', id: 'CRM-10022', note: 'Pine Hills ISD — $86K ARR' },
      { source: 'Product Telemetry', id: 'PU-20023,20027,20028', note: 'Pine Hills ISD + Pine Hills Literacy Pilot + PINE_HILLS_LITERACY_PILOT (underscore artifact)' },
      { source: 'NetSuite Billing', id: 'BILL-30012', note: '"Pine Hills Independent School District Finance" verbose name resolved' },
    ]
  },
  { id: 'GC0005', canonical_name: 'Maple Grove ISD', legal_name: 'Maple Grove Independent School District', industry: 'K-12 Education', hq_country: 'USA',
    source_variants: ['Maple Grove ISD - Supplemental','Maple Grove Independent School District','Maple Grove Public Schools'],
    products_active: ['Courseware','StudySync','Imagine Learning PD'], application: 'Courseware, StudySync, Imagine Learning PD',
    total_arr: 151022, open_pipeline: 28000, deal_count: 2, rep_count: 1,
    student_enrollment: 72784, region: 'West', segment: 'Large District',
    suppliers: ['Salesforce CRM','NetSuite Billing'],
    _lineage: [
      { source: 'Salesforce CRM', id: 'CRM-10028,10035', note: '"Maple Grove ISD - Supplemental" + "Maple Grove Independent School District" unified' },
      { source: 'NetSuite Billing', id: 'BILL-30017,30018,30019', note: '3 billing records unified' },
    ]
  },
];

const CRM_HARMONIZATION_ISSUES = [
  { id: 'il-1', type: 'normalization', description: 'Unify "Houston ISD" — 8 name variants, $463K combined ARR hidden', confidence: 0.96, resolved: false,
    before: { values: ['Houston Independent School District','Houston ISD - Supplemental','Houston School District','Houston Public Schools','Houston Federal Programs','Houston Math Program','Houston Literacy Pilot','HOUSTON MATH PROGRAM'] },
    after: { canonical: 'Houston ISD', legal_name: 'Houston Independent School District', golden_id: 'GC0001', combined_arr: '$463,118', impact: 'Reveals full district footprint across 4 products' },
    reasoning: 'All 8 variants refer to Houston Independent School District. Matched via Jaro-Winkler similarity > 0.91 + shared contact email domains (@houstonschools.org) + state/region overlap across CRM, billing, and usage systems. District reference enrichment (NCES) then confirms the final legal name and district profile for the merged record. Consolidating reveals true ARR of $463K vs $60K visible per-record. Enables coordinated renewal and expansion strategy.',
    sources: [
      { file: 'salesforce_crm.csv', rows: [0,1,2,3], evidence: 'CRM records with 4 name variants' },
      { file: 'product_usage.csv', rows: [0,1,2,3], evidence: 'HOUSTON MATH PROGRAM = Houston Math Program (all-caps)' },
      { file: 'contract_billing.csv', rows: [0,1,2,3,4], evidence: 'Houston Public Schools + Houston Federal Programs = same billing entity' },
    ]
  },
  { id: 'il-2', type: 'normalization', description: 'Unify "Riverview ISD" — 5 variants, $436K split across records', confidence: 0.94, resolved: false,
    before: { values: ['Riverview ISD','Riverview Public Schools','Riverview Federal Programs','Riverview Credit Recovery','RIVERVIEW CREDIT RECOVERY'] },
    after: { canonical: 'Riverview ISD', legal_name: 'Riverview Independent School District', golden_id: 'GC0002', combined_arr: '$436,016' },
    reasoning: 'Riverview ISD is the primary district entity. "Riverview Federal Programs" and "Riverview Credit Recovery" are program units within the district. "RIVERVIEW CREDIT RECOVERY" is an all-caps data entry error. Unified under GC0002 reveals $436K full ARR.',
    sources: [
      { file: 'salesforce_crm.csv', rows: [4,5,6], evidence: '3 CRM records with Riverview name variants' },
      { file: 'product_usage.csv', rows: [4,5], evidence: 'RIVERVIEW CREDIT RECOVERY all-caps variant' },
      { file: 'contract_billing.csv', rows: [5,6,7], evidence: 'Riverview Federal Programs = same district' },
    ]
  },
  { id: 'il-3', type: 'normalization', description: '"Oak Valley Independent School District" vs "Oak Valley School District" — $276K split', confidence: 0.92, resolved: false,
    before: { values: ['Oak Valley Independent School District','Oak Valley School District','Oak Valley Public Schools','Oak Valley Federal Programs'] },
    after: { canonical: 'Oak Valley School District', legal_name: 'Oak Valley School District', golden_id: 'GC0003', combined_arr: '$276,277' },
    reasoning: 'District reference enrichment (NCES) confirms Oak Valley School District after the Salesforce and billing variants are clustered. "Independent School District" suffix used by Salesforce rep; "School District" used by finance. Shared reference matching validates the final legal name. Combined ARR triggers enterprise tier review.',
    sources: [
      { file: 'salesforce_crm.csv', rows: [7,8], evidence: '"ISD" vs "School District" suffix variant' },
      { file: 'contract_billing.csv', rows: [8,9,10], evidence: '3 billing names for same Oak Valley district' },
    ]
  },
  { id: 'il-4', type: 'normalization', description: '"PINE_HILLS_LITERACY_PILOT" — underscores replacing spaces (export artifact)', confidence: 0.99, resolved: false,
    before: { product_org_name: 'PINE_HILLS_LITERACY_PILOT', in_system: 'Product Telemetry' },
    after: { canonical: 'Pine Hills Literacy Pilot', matched_to: 'Pine Hills ISD (GC0004)' },
    reasoning: 'ProductTelemetry system exported org names with underscores replacing spaces - a known export artifact. "PINE_HILLS_LITERACY_PILOT" -> "Pine Hills Literacy Pilot" by space normalization + title-case. Final district attachment is validated against the resolved district reference profile.',
    sources: [
      { file: 'product_usage.csv', rows: [10], evidence: 'PINE_HILLS_LITERACY_PILOT underscore artifact' },
    ]
  },
  { id: 'il-5', type: 'matching', description: '"PL" billing code → map to "Imagine Learning PD" product', confidence: 0.97, resolved: false,
    before: { product_name_billing: 'PL', in_system: 'NetSuite Billing', product_family: 'Professional Learning' },
    after: { canonical_product: 'Imagine Learning PD', product_family: 'Professional Learning', cross_ref: 'Salesforce product_name: Imagine Learning PD' },
    reasoning: 'Finance team uses 2-letter abbreviation "PL" for Professional Learning / Imagine Learning PD. Cross-referenced product_family field ("Professional Learning") and invoice amounts ($180K range) to confirm match. "PD Services" also maps to Imagine Learning PD based on product_family.',
    sources: [
      { file: 'contract_billing.csv', rows: [2], evidence: '"PL" abbreviation in product_name_billing field' },
    ]
  },
  { id: 'il-6', type: 'enrichment', description: 'Compute total_arr_usd per canonical district — impossible without deduplication', confidence: 0.99, resolved: false,
    before: { problem: 'Houston ISD: 4 CRM records at $60K, $89K, $62K, $252K. No aggregated total field. Appears as 4 separate mid-market accounts.' },
    after: { solution: 'GC0001 total_arr = $463,118', breakdown: 'CRM-10001: $60K + CRM-10002: $89K + CRM-10003: $62K + CRM-10004: $252K', impact: 'Correct district tier: Mid-Market → Enterprise. Triggers dedicated CSM assignment.' },
    reasoning: 'District-level ARR determines CSM assignment, QBR cadence, and renewal priority. $463K Houston ISD is a top-tier district — currently invisible due to data fragmentation across 4 account records.',
    sources: [
      { file: 'salesforce_crm.csv', rows: [0,1,2,3], evidence: '4 separate ARR values for same district' },
      { file: 'contract_billing.csv', rows: [0,1,2,3,4], evidence: '5 billing records with separate invoice amounts' },
    ]
  },
  { id: 'il-7', type: 'validation', description: 'Segment casing: "charter network" → "Charter Network"', confidence: 0.99, resolved: false,
    before: { values: ['Charter Network','charter network','Large District','Mid-Market District'] },
    after: { canonical_values: ['Charter Network','Large District','Mid-Market District','State/Regional'], rule: 'Title case for segment field' },
    reasoning: '"charter network" appears 2x lowercase while "Charter Network" appears 18x in title case. Breaks GROUP BY queries in Salesforce reports. Standardizing to title case based on modal value. No semantic change.',
    sources: [
      { file: 'salesforce_crm.csv', rows: [1], evidence: 'Row 2: "charter network" instead of "Charter Network"' },
    ]
  },
];

const CRM_CANONICAL_FIELDS = [
  { name: 'canonical_account_name', type: 'string', required: true,
    source: 'account_name (Salesforce) + billing_customer_name (NetSuite) + product_org_name (ProductTelemetry)',
    logic: 'Fuzzy match across all 3 source systems via Jaro-Winkler similarity. Once a cluster is formed, validate the district identity against district reference enrichment (NCES) when available. Prefer short unambiguous name (e.g. "Houston ISD" not "Houston Independent School District").',
    samples: ['Houston ISD','Riverview ISD','Oak Valley School District','Pine Hills ISD','Maple Grove ISD'] },
  { name: 'legal_name', type: 'string', required: true,
    source: 'canonical_account_name (resolved cluster) + district_legal_name (NCES reference)',
    logic: 'After the district cluster is resolved, join district reference enrichment to pull the contract-safe legal name. If no confident reference match exists, fall back to the cleanest CRM or billing variant.',
    samples: ['Houston Independent School District','Riverview Independent School District','Pine Hills Independent School District'] },
  { name: 'total_arr_usd', type: 'currency', required: true,
    source: 'arr_usd (Salesforce) + invoice_amount_usd (NetSuite) — matched via canonical_account_name',
    logic: 'Sum all ARR/invoice values across matched account name variants. Only possible after deduplication. Determines CSM assignment (>$200K = dedicated CSM) and QBR cadence.',
    samples: ['$463,118','$436,016','$276,277','$326,244','$151,022'] },
  { name: 'products_active', type: 'array', required: true,
    source: 'product_name (Salesforce) + product_family_billing (NetSuite) + product_name (ProductTelemetry)',
    logic: 'Union of active products across merged variants. Normalizes abbreviations: "PL" → "Imagine Learning PD". Enables cross-sell gap analysis across district accounts.',
    samples: ['Imagine Learning PD, Twig Science, Courseware','Imagine Math, Imagine Language & Literacy','Courseware, StudySync'] },
  { name: 'student_enrollment', type: 'integer', required: false,
    source: 'matched_district_profile (NCES reference)',
    logic: 'Optional reference enrichment once district identity is resolved. Used for seat ratio analysis (seats_contracted / enrollment = penetration rate) and pricing model validation.',
    samples: ['91,196','76,063','101,958','14,656','72,784'] },
  { name: 'region', type: 'enum', required: true,
    source: 'region (Salesforce) + district_region_reference (NCES)',
    logic: 'Keep the operational region from Salesforce, but use district reference mapping to flag or override clear state/region mismatches. Supports territory reporting and rep assignment.',
    samples: ['West','South','Northeast','Midwest'] },
];

const RULES_DATA = {
  user: [
    { id: 'rule-u1', name: 'District name standardization', description: 'Prefer district reference legal name (NCES) when resolving "Independent School District" vs "School District" suffix variants', type: 'normalization', created: '2026-04-10', status: 'active', appliedCount: 47, createdFrom: 'Manual — district data governance policy' },
    { id: 'rule-u2', name: 'All-caps org name normalization', description: 'Convert all-caps product org names to title case (e.g., "HOUSTON MATH PROGRAM" → "Houston Math Program")', type: 'normalization', created: '2026-04-15', status: 'active', appliedCount: 23, createdFrom: 'Manual — ProductTelemetry export quirk' },
    { id: 'rule-u3', name: 'Federal Programs = parent district', description: 'Any billing_customer_name with "Federal Programs" suffix maps to the same parent district in CRM', type: 'matching', created: '2026-04-18', status: 'active', appliedCount: 12, createdFrom: 'Sent from issue: Houston Federal Programs billing mismatch' },
  ],
  ai: [
    { id: 'rule-a1', name: 'Underscore-to-space conversion', description: 'ProductTelemetry export artifact: underscores in org names replace spaces — apply space normalization + title case', type: 'normalization', confidence: 0.99, suggestedFrom: 'PINE_HILLS_LITERACY_PILOT pattern (il-4)', status: 'pending_review', suggestedDate: '2026-04-21' },
    { id: 'rule-a2', name: '"PL" abbreviation → Imagine Learning PD', description: 'NetSuite uses "PL" consistently for Professional Learning/Imagine Learning PD — create explicit product code mapping', type: 'normalization', confidence: 0.97, suggestedFrom: 'Billing abbreviation resolution (il-5)', status: 'pending_review', suggestedDate: '2026-04-21' },
    { id: 'rule-a3', name: '"Supplemental" suffix = same district', description: 'Account names ending in "- Supplemental" should map to the primary district account', type: 'matching', confidence: 0.91, suggestedFrom: 'Houston ISD / Riverview ISD dedup patterns', status: 'pending_review', suggestedDate: '2026-04-21' },
    { id: 'rule-a4', name: '"Credit Recovery" = program unit', description: 'Accounts with "Credit Recovery" suffix are program units of the parent district — not separate accounts', type: 'matching', confidence: 0.88, suggestedFrom: 'Riverview Credit Recovery / Oak Valley Credit Recovery', status: 'pending_review', suggestedDate: '2026-04-21' },
  ],
  pending: [
    { id: 'rule-p1', name: 'Segment casing normalization', description: '"charter network" → "Charter Network" — title case for segment field', type: 'normalization', severity: 'low', source: 'il-7', status: 'ready_to_apply' },
    { id: 'rule-p2', name: '"Public Schools" suffix = same district', description: 'Billing names with "Public Schools" suffix map to primary CRM district account', type: 'matching', severity: 'medium', source: 'il-2', status: 'ready_to_apply' },
    { id: 'rule-p3', name: 'District reference state override', description: 'When rep-entered state disagrees with district reference state (NCES) for a known district, use the reference value', type: 'validation', severity: 'medium', source: 'il-6', status: 'ready_to_apply' },
  ]
};
