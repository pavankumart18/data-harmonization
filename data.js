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
    narration: '<em>58,460 raw records collapsed into 5,260 golden records</em> — a <strong>91% deduplication ratio</strong>. Each golden record traces lineage back to multiple source files. Here\'s the Anti-CD20 antibody: merged from US, EU, and Nordic catalogs.', stepLabel: 'Step 10 of 12 — Golden Dataset', duration: 7000 },
  { page: 'search', highlight: '.search-result:nth-child(1)', action: () => { state.searchQuery = 'cd20'; state.isGolden = false; renderAll(); },
    narration: 'Search for <strong>"CD20"</strong> in <span style="color:var(--red)">raw data</span> — you get 4 fragmented results: "Anti-CD20 Monoclonal Antibody", "Anti CD20 mAb", "Anti-CD20 Antikorper", "CD20 antikropp FITC". A scientist would be confused.', stepLabel: 'Step 11 of 12 — Raw Search Pain', duration: 5500 },
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
