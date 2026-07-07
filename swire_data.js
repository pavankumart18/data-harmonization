// ============================================================
//  Swire Repeat Order Intelligence — Scenario 3 Dataset
//  Synthetic Outlet-SKU golden record data (demo only)
//  Seeded per Swire synthetic data generation context (seed 20260703)
// ============================================================

const SWIRE_FILES = {
  'raw_erp_outlet_master.csv': {
    type: 'csv', source: 'ERP / CONA', rows: 3500, region: 'ERP',
    description: 'ERP/CONA customer & ship-to master — duplicate ship-tos, mixed delivery window formats, stale active flags',
    headers: ['customer_id','sold_to_id','ship_to_id','customer_name','address1','city','state','zip','customer_type','active_flag','default_route_code','delivery_window_text','dc_code'],
    data: [
      ['CUST-10231','WMT-CORP-001','ST-88213','Walmart #1482','10600 S State St','Sandy','UT','84070','Grocery','Y','R27','06:00-10:00','SLC'],
      ['CUST-10457','WMT-CORP-001','ST-88377','Wal-Mart 1482','10600 South State Street','Sandy','UT','84070','Grocery','Y','SLC-27','Morning','Salt Lake City DC'],
      ['CUST-10389','MAV-CORP-004','ST-71022','Maverik #211','3688 W 3500 S','West Valley City','UT','84119','Convenience','Y','R31','6-10','SLC'],
      ['CUST-10442','SMI-CORP-002','ST-64018','Smiths Marketplace 087','455 S 500 E','Salt Lake City','UT','84102','Grocery','Y','R27','','SLC'],
      ['CUST-10515','HAR-CORP-003','ST-59204','Harmons #12','125 E 13800 S','Draper','UT','84020','Grocery','Y','R31','05:00-09:00','SLC'],
      ['CUST-10578','SEV-CORP-009','ST-45110','7-Eleven 33412','4998 S State St','Murray','UT','84107','Convenience','Y','R44','Afternoon','SLC'],
      ['CUST-10603','COS-CORP-005','ST-30761','Costco Wholesale #687','11100 S Auto Mall Dr','Sandy','UT','84070','Club','Y','R27','04:00-08:00','UT-DC-01'],
      ['CUST-10644','','ST-20955','Del Taco 402','3956 W 5415 S','Kearns','UT','84118','Restaurant','Y','R52','10-2','SLC'],
      ['CUST-10688','ALP-CORP-011','ST-17842','Alpine SD Nutrition Svcs','575 N 100 E','American Fork','UT','84003','School','Y','R61','07:00-11:00','SLC'],
      ['CUST-10701','TOP-CORP-013','ST-15233','Top Stop #8','1245 N Canyon Rd','Provo','UT','84604','Convenience','Y','R58','','SLC'],
      ['CUST-10730','LEE-CORP-014','ST-12980','Lees Marketplace Logan','555 E 1400 N','Logan','UT','84341','Grocery','Y','R73','06:00 AM - 10:00 AM','SLC'],
      ['CUST-10754','CHE-CORP-016','ST-11207','Chevron Extra Mile 77','1650 W University Pkwy','Orem','UT','84058','Convenience','Y','R58','Morning','SLC'],
      ['CUST-10777','RIV-CORP-017','ST-09551','Riverside Diner','830 S Main St','Brigham City','UT','84302','Restaurant','Y','R73','11-3','SLC'],
      ['CUST-10802','MAC-CORP-018','ST-08414','Maceys #09','7850 S 1300 E','Sandy','UT','84094','Grocery','Y','R27','06:00-10:00','SLC'],
    ],
    issues: [
      { col: 'ship_to_id', type: 'duplicate', desc: 'ST-88213 and ST-88377 are the same Walmart Sandy location under two customer IDs — "Walmart #1482" vs "Wal-Mart 1482"', severity: 'high', rows: [0,1] },
      { col: 'delivery_window_text', type: 'format', desc: 'Mixed window formats: "06:00-10:00", "Morning", "6-10", "06:00 AM - 10:00 AM", "10-2" — cannot compute route feasibility', severity: 'high' },
      { col: 'default_route_code', type: 'normalization', desc: '"SLC-27" vs "R27" — ERP route code differs from TMS route ID format for the same route', severity: 'high', rows: [1] },
      { col: 'delivery_window_text', type: 'missing', desc: 'Smiths Marketplace 087 and Top Stop #8 have no delivery window in ERP (TMS route plan has one)', severity: 'medium', rows: [3,9] },
      { col: 'dc_code', type: 'normalization', desc: '"SLC" vs "Salt Lake City DC" vs "UT-DC-01" — three names for the same distribution center', severity: 'medium', rows: [1,6] },
      { col: 'active_flag', type: 'stale', desc: 'Riverside Diner closed in May but is still marked active and appears in the route plan', severity: 'medium', row: 12 },
      { col: 'sold_to_id', type: 'missing', desc: 'Del Taco 402 has no sold_to — invoices cannot roll up to the corporate account', severity: 'medium', row: 7 },
      { col: 'customer_type', type: 'missing', desc: 'No priority tier anywhere in ERP — tier only exists in the CRM outlet list', severity: 'low' },
    ]
  },

  'raw_crm_sales_outlets.csv': {
    type: 'csv', source: 'CRM / Sales Execution', rows: 3200, region: 'CRM',
    description: 'Sales-owned outlet list — informal names, missing rep IDs, territories that do not map to routes or DCs',
    headers: ['crm_account_id','outlet_name','street_address','city','state','zip','sales_rep_name','sales_rep_id','territory','channel','priority_tier','contact_name','last_visit_date'],
    data: [
      ['CRM-5001','WM Supercenter 1482','10600 S State','Sandy','UT','84070','M. Webb','REP-114','SLC Metro East','Grocery','A','Receiving Desk','2026-06-24'],
      ['CRM-5002','Maverik 211','3688 W 3500 S','West Valley','UT','84119','','','Wasatch North','Convenience','B','Store Lead','2026-06-18'],
      ['CRM-5003',"Smith's Marketplace #087",'455 S 500 E Ste B','Salt Lake City','UT','84102','M. Webb','REP-114','SLC Metro East','Grocery','A','Grocery Mgr','2026-06-26'],
      ['CRM-5004',"Harmon's Draper",'125 E 13800 S','Draper','UT','84020','D. Ortiz','REP-207','SLC Metro South','Grocery','A','Beverage Buyer','2026-06-20'],
      ['CRM-5005','7-11 #33412','4998 State St','Murray','UT','84107','D. Ortiz','REP-207','SLC Metro South','Convenience','B','Shift Lead','2026-06-25'],
      ['CRM-5006','Costco Sandy #687','11100 Auto Mall Drive','Sandy','UT','84070','M. Webb','REP-114','SLC Metro East','Club','A','Depot Desk','2026-06-23'],
      ['CRM-5007','Del Taco - Kearns','3956 W 5415 S','Kearns','UT','84118','','','West Valley','Restaurant','C','Franchise Op','2026-05-30'],
      ['CRM-5008','Alpine School District','575 North 100 East','American Fork','UT','84003','K. Patel','REP-311','Utah County','School','B','Nutrition Office','2026-06-12'],
      ['CRM-5009','Top Stop Provo #8','1245 Canyon Rd','Provo','UT','84604','K. Patel','REP-311','Utah County','Convenience','C','Owner','2026-06-19'],
      ['CRM-5010',"Lee's Marketplace - Logan",'555 E 1400 N','Logan','UT','84341','J. Fuentes','REP-402','Cache Valley','Grocery','B','Grocery Mgr','2026-06-15'],
      ['CRM-5011','Chevron ExtraMile #77','1650 University Pkwy','Orem','UT','84058','K. Patel','REP-311','Utah County','Convenience','C','Cashier Lead','2026-06-21'],
      ['CRM-5012',"Macey's Sandy",'7850 S 1300 E','Sandy','UT','84094','M. Webb','REP-114','SLC Metro East','Grocery','B','Receiving','2026-06-27'],
    ],
    issues: [
      { col: 'outlet_name', type: 'normalization', desc: 'Informal abbreviations: "WM Supercenter 1482", "7-11 #33412", "Smith\'s" with apostrophe — none exactly match ERP customer names', severity: 'high', rows: [0,2,4] },
      { col: 'sales_rep_id', type: 'missing', desc: 'Maverik 211 and Del Taco - Kearns have no sales_rep_id (2 of 12 = 17%) — ownership must be inferred', severity: 'high', rows: [1,6] },
      { col: 'territory', type: 'conflict', desc: 'Territories ("Wasatch North", "SLC Metro East") do not map cleanly to ERP route codes or DCs', severity: 'medium' },
      { col: 'street_address', type: 'format', desc: '"455 S 500 E Ste B" vs ERP "455 S 500 E" — suite/unit differences break exact address joins', severity: 'medium', rows: [2] },
      { col: 'priority_tier', type: 'conflict', desc: 'Priority tier exists here (A/B/C) but not in ERP — tier must be carried onto the golden outlet', severity: 'low' },
    ]
  },

  'raw_order_history.csv': {
    type: 'csv', source: 'ERP Order Mgmt', rows: 120000, region: 'Orders',
    description: '14 weeks of order transactions — UOM chaos, late edits, orders attached to sold-to instead of ship-to',
    headers: ['order_id','order_date','customer_id','ship_to_id','sku_id','sku_description','order_qty','order_uom','order_source','order_cutoff_time','modified_flag','modification_timestamp'],
    data: [
      ['ORD-90211','2026-06-22','CUST-10231','ST-88213','DA-5501','Dasani 24pk 16.9oz','40','CASE','EDI','17:00','N',''],
      ['ORD-90212','2026-06-22','CUST-10231','ST-88213','KO-1201','Coca-Cola Classic 24pk 12oz','55','CS','EDI','17:00','N',''],
      ['ORD-90228','2026-06-23','WMT-CORP-001','','KOZ12PK','CZ 12/12','18','cases','portal','17:00','Y','2026-06-23T18:42'],
      ['ORD-90241','2026-06-24','CUST-10389','ST-71022','KO-2044','Coke Zero 12pk 12oz','12','CASE','rep','16:00','N',''],
      ['ORD-90242','2026-06-24','CUST-10389','ST-71022','SP-3300','Sprite 20oz','96','EA','rep','16:00','N',''],
      ['ORD-90255','2026-06-24','CUST-10442','ST-64018','KO-1188','Coca-Cola Classic 12pk 12oz','30','CASE','standing','17:00','N',''],
      ['ORD-90256','2026-06-24','CUST-10442','ST-64018','DA-5501','Dasani 24pk','22','CS','standing','17:00','Y','2026-06-24T19:03'],
      ['ORD-90263','2026-06-25','CUST-10515','ST-59204','KOZ12PK','Coke Zero 12pk','15','Case','phone','16:30','N',''],
      ['ORD-90271','2026-06-25','CUST-10578','ST-45110','SP-3300','Sprite 20oz PET','48','Each','portal','15:00','N',''],
      ['ORD-90278','2026-06-25','CUST-10603','ST-30761','DA-5501','DASANI WATER 24PK','1','Pallet','EDI','17:00','N',''],
      ['ORD-90284','2026-06-26','CUST-10644','ST-20955','KO-1509','Coca-Cola 2L','10','EA','phone','14:00','N',''],
      ['ORD-90290','2026-06-26','CUST-10688','ST-17842','MM-7801','Minute Maid Lemonade 12pk','25','CASE','EDI','17:00','N',''],
      ['ORD-90297','2026-06-26','CUST-10701','ST-15233','PW-6600','Powerade Mtn Berry 8pk','14','CS','rep','16:00','Y','2026-06-26T17:55'],
      ['ORD-90301','2026-06-27','CUST-10730','ST-12980','KO-1201','Coke Classic 24/12','26','cases','sales rep','17:00','N',''],
      ['ORD-90309','2026-06-27','CUST-10754','ST-11207','KO-0987','Coke Classic 20oz glass','6','CASE','phone','15:00','N',''],
      ['ORD-90315','2026-06-28','CUST-10802','ST-08414','KO-1188','Coca-Cola Classic 12pk','28','CASE','standing','17:00','N',''],
      ['ORD-90322','2026-06-28','CUST-10231','ST-88213','FA-4102','Fanta Orange 12pk','20','CASE','EDI','17:00','N',''],
      ['ORD-90330','2026-06-29','CUST-10442','ST-64018','SM-8102','smartwater 1L 6pk','12','CS','portal','17:00','Y','2026-06-29T18:20'],
    ],
    issues: [
      { col: 'order_uom', type: 'normalization', desc: '7 UOM spellings in one column: CASE / CS / cases / Case / EA / Each / Pallet — quantities are not comparable', severity: 'high' },
      { col: 'customer_id', type: 'matching', desc: 'ORD-90228 is attached to sold-to WMT-CORP-001 with no ship_to_id — cannot tell which Walmart location ordered', severity: 'high', rows: [2] },
      { col: 'sku_description', type: 'normalization', desc: '"CZ 12/12", "Coke Zero 12pk", "Coke Zero 12pk 12oz" — pack variants of the same SKU hide the repeat pattern', severity: 'high', rows: [2,3,7] },
      { col: 'modified_flag', type: 'stale', desc: '4 of 18 orders (22%) edited after the 17:00 cutoff — late edits disrupt load planning', severity: 'medium', rows: [2,6,12,17] },
      { col: 'order_source', type: 'normalization', desc: '"rep" vs "sales rep" vs portal/phone/standing/EDI — source vocabulary is uncontrolled', severity: 'medium', rows: [13] },
      { col: 'sku_id', type: 'stale', desc: 'KO-0987 (legacy 20oz glass) is inactive in the SKU master but still being ordered', severity: 'medium', rows: [14] },
    ]
  },

  'raw_sku_master.csv': {
    type: 'csv', source: 'ERP Product Master', rows: 850, region: 'SKU',
    description: 'SKU/product master — legacy + new SKUs for the same item, inconsistent pack naming, missing substitute groups',
    headers: ['sku_id','gtin','product_name','brand','flavor','package','pack_size','container_size','unit_per_case','active_flag','substitute_group','category'],
    data: [
      ['KO-1201','00049000042566','Coca-Cola Classic 24pk 12oz Can','Coca-Cola','Cola','Can','24pk','12oz','24','Y','SG-COLA','Sparkling'],
      ['KO-1188','00049000028911','Coca-Cola Classic 12pk 12oz Can','Coca-Cola','Cola','Can','12pk','12oz','12','Y','SG-COLA','Sparkling'],
      ['KO-2044','00049000550001','Coca-Cola Zero Sugar 12pk 12oz Can','Coca-Cola','Zero Sugar','Can','12pk','12oz','12','Y','SG-COLA-ZS','Sparkling'],
      ['KOZ12PK','','Coke Zero 12pk 12oz','KO','Zero','Can','12 pk','12 oz','12','Y','','Sparkling'],
      ['SP-3300','00049000030731','Sprite 20oz PET Bottle','Sprite','Lemon-Lime','PET','single','20oz','24','Y','SG-LL','Sparkling'],
      ['FA-4102','00049000091447','Fanta Orange 12pk 12oz','Fanta','Orange','Can','12pk','12oz','12','Y','SG-FLAV','Sparkling'],
      ['DA-5501','00049000068525','Dasani Purified Water 24pk 16.9oz','Dasani','Water','PET','24pk','16.9oz','24','Y','SG-WATER','Still'],
      ['PW-6600','00049000027581','Powerade Mountain Berry Blast 8pk','Powerade','Mtn Berry','PET','8pk','20oz','8','Y','','Sports'],
      ['MM-7801','00025000044907','Minute Maid Lemonade 12pk 12oz','Minute Maid','Lemonade','Can','12PK','12 oz','12','Y','SG-JUICE','Juice'],
      ['SM-8102','00786162004010','smartwater 6pk 1L','smartwater','Water','PET','6pk','1L','6','Y','SG-WATER','Still'],
      ['KO-1509','00049000053001','Coca-Cola Classic 2L Bottle','Coke','Cola','PET','single','2L','8','Y','SG-COLA','Sparkling'],
      ['KO-0987','00049000000443','Coke Classic 20oz Glass (Legacy)','Coca-Cola','Cola','Glass','single','20oz','24','N','SG-COLA','Sparkling'],
    ],
    issues: [
      { col: 'sku_id', type: 'duplicate', desc: 'KOZ12PK (legacy) and KO-2044 (new) are the same Coca-Cola Zero Sugar 12pk 12oz — orders arrive under both codes', severity: 'high', rows: [2,3] },
      { col: 'pack_size', type: 'format', desc: '"12pk" vs "12 pk" vs "12PK" vs "single" — pack naming inconsistent across rows', severity: 'medium', rows: [3,8] },
      { col: 'brand', type: 'normalization', desc: '"KO" and "Coke" used instead of "Coca-Cola" — brand rollups undercount the flagship brand', severity: 'high', rows: [3,10] },
      { col: 'substitute_group', type: 'missing', desc: 'KOZ12PK and Powerade 8pk have no substitute_group — no fallback suggestion when short', severity: 'medium', rows: [3,7] },
      { col: 'active_flag', type: 'stale', desc: 'Inactive KO-0987 still appears in current order history (Chevron ExtraMile #77)', severity: 'medium', rows: [11] },
    ]
  },

  'raw_tms_route_plan.csv': {
    type: 'csv', source: 'TMS / Route Planning', rows: 18000, region: 'TMS',
    description: 'Route plan with stop sequences — route IDs differ from ERP, DC naming varies, delivery windows conflict',
    headers: ['route_id','route_date','dc_id','truck_id','driver_id','stop_sequence','ship_to_id','planned_arrival_time','planned_departure_time','delivery_window_start','delivery_window_end','route_type'],
    data: [
      ['SaltLake_027','2026-07-03','SLC','TRK-208','DRV-77','1','ST-30761','04:40','05:10','04:00','08:00','Club'],
      ['SaltLake_027','2026-07-03','SLC','TRK-208','DRV-77','2','ST-88213','06:15','06:55','06:00','10:00','Grocery'],
      ['SaltLake_027','2026-07-03','SLC','TRK-208','DRV-77','3','ST-88377','','','06:00','10:00','Grocery'],
      ['R27','2026-07-03','Salt Lake City DC','TRK-212','DRV-81','4','ST-64018','08:05','08:35','07:00','11:00','Grocery'],
      ['SaltLake_031','2026-07-03','SLC','TRK-214','DRV-82','1','ST-71022','06:50','07:15','06:00','10:00','Convenience'],
      ['SaltLake_031','2026-07-03','SLC','TRK-214','DRV-82','2','ST-59204','05:20','05:50','05:00','09:00','Grocery'],
      ['R44','2026-07-03','SLC','TRK-219','DRV-88','1','ST-45110','13:10','13:30','12:00','16:00','Convenience'],
      ['R44','2026-07-03','SLC','TRK-219','DRV-88','2','TMS-C-2291','14:05','14:25','13:00','17:00','Convenience'],
      ['R52','2026-07-03','SLC','TRK-221','DRV-90','1','ST-20955','10:45','11:05','10:00','14:00','Restaurant'],
      ['R61','2026-07-03','SLC','TRK-224','DRV-93','1','ST-17842','07:30','08:00','07:00','11:00','School'],
      ['R58','2026-07-03','SLC','TRK-226','DRV-95','1','ST-15233','09:10','09:30','','','Convenience'],
      ['R58','2026-07-03','SLC','TRK-226','DRV-95','2','ST-11207','09:55','10:15','09:00','13:00','Convenience'],
      ['R73','2026-07-04','SLC','TRK-230','DRV-97','1','ST-12980','06:40','07:05','05:00','09:00','Grocery'],
      ['R27','2026-07-04','UT-DC-01','TRK-212','DRV-81','5','ST-08414','07:20','07:45','06:00','10:00','Grocery'],
    ],
    issues: [
      { col: 'route_id', type: 'normalization', desc: '"SaltLake_027" vs "R27" (and "SaltLake_031" vs ERP "R31") — TMS route IDs differ from ERP route codes for the same trucks', severity: 'high', rows: [0,3,4] },
      { col: 'ship_to_id', type: 'matching', desc: 'Stop 2 on R44 uses TMS-internal customer ID "TMS-C-2291" — no ERP ship-to; needs address/route context match', severity: 'high', rows: [7] },
      { col: 'delivery_window_start', type: 'conflict', desc: 'Lees Marketplace window 05:00-09:00 in TMS vs 06:00 AM - 10:00 AM in ERP customer master', severity: 'medium', rows: [12] },
      { col: 'planned_arrival_time', type: 'missing', desc: 'Duplicate Walmart stop ST-88377 has no planned arrival — dispatcher skips it manually every day', severity: 'medium', rows: [2] },
      { col: 'dc_id', type: 'normalization', desc: '"SLC", "Salt Lake City DC", "UT-DC-01" — DC naming varies inside the same file', severity: 'medium', rows: [3,13] },
      { col: 'delivery_window_start', type: 'missing', desc: 'Top Stop #8 has no window in TMS either — both systems blank', severity: 'low', rows: [10] },
    ]
  },

  'raw_inventory_snapshot.csv': {
    type: 'csv', source: 'ERP Inventory', rows: 8000, region: 'Inventory',
    description: 'Availability by DC and SKU — stale snapshots, mixed status vocabulary, legacy SKU codes, negative availability',
    headers: ['snapshot_timestamp','dc_id','sku_id','on_hand_cases','allocated_cases','available_cases','inventory_status','freshness_flag'],
    data: [
      ['2026-07-05T06:00','SLC','KO-1201','4200','1150','3050','Available','FRESH'],
      ['2026-07-05T06:00','SLC','KO-1188','3600','900','2700','in stock','FRESH'],
      ['2026-07-05T06:00','SLC','KO-2044','1850','640','1210','OK','FRESH'],
      ['2026-07-05T06:00','SLC','KOZ12PK','120','180','-60','avail','FRESH'],
      ['2026-07-05T06:00','SLC','SP-3300','260','240','20','Low','FRESH'],
      ['2026-07-05T06:00','SLC','DA-5501','5100','1220','3880','Available','FRESH'],
      ['2026-07-04T22:15','DEN','KO-1201','2900','800','2100','OK','STALE'],
      ['2026-07-05T06:00','PHX','DA-5501','3300','640','2660','Available','FRESH'],
      ['2026-07-03T05:30','BOI','PW-6600','240','260','-20','OOS','STALE'],
      ['2026-07-05T06:00','SEA','SP-3300','1400','300','1100','in stock','FRESH'],
      ['2026-07-05T06:00','PDX','MM-7801','760','120','640','Available','FRESH'],
      ['2026-07-05T06:00','SLC','SM-8102','980','210','770','avail','FRESH'],
    ],
    issues: [
      { col: 'available_cases', type: 'validation', desc: 'Negative availability: KOZ12PK at SLC (-60) and PW-6600 at Boise (-20) — allocation exceeds on-hand', severity: 'high', rows: [3,8] },
      { col: 'inventory_status', type: 'normalization', desc: '"Available", "in stock", "OK", "avail", "Low", "OOS" — six status spellings; none filter together', severity: 'high' },
      { col: 'freshness_flag', type: 'stale', desc: 'Denver snapshot is from 22:15 the prior day, Boise from 2 days ago — order cutoff sees stale availability', severity: 'medium', rows: [6,8] },
      { col: 'sku_id', type: 'normalization', desc: 'Inventory still keyed on legacy KOZ12PK while new orders use KO-2044 — availability splits across two codes', severity: 'medium', rows: [3] },
      { col: 'snapshot_timestamp', type: 'conflict', desc: 'Snapshot at 06:00 vs order cutoff at 17:00 — allocation timing differs from order date', severity: 'low' },
    ]
  },

  'raw_sales_rep_territory.xlsx': {
    type: 'xlsx', source: 'Sales Ops Spreadsheet', rows: 1100, region: 'Sales Ops',
    description: 'Rep/territory mapping spreadsheet — overlapping effective dates, comma-packed route codes, names differ from CRM',
    headers: ['sales_rep_id','sales_rep_name','territory','route_codes','zip_codes','channel_focus','manager_name','effective_start','effective_end'],
    data: [
      ['REP-114','Webb, Marcus','SLC Metro East','R27,SLC-27, R44','84070,84094,84102,84107','Grocery/Club','T. Askew','2025-01-01',''],
      ['REP-207','Ortiz, Dana','SLC Metro South','R31,R52','84020,84118','Grocery','T. Askew','2025-01-01',''],
      ['REP-311','Patel, Kiran','Utah County','R58, R61','84003,84058,84604','Convenience/School','T. Askew','2025-03-15',''],
      ['REP-402','Fuentes, Jo','Cache Valley','R73','84302,84341','Grocery','R. Chen','2025-01-01',''],
      ['REP-118','Webb, M.','SLC Metro East','R27','84070','Grocery','T. Askew','2024-06-01','2025-12-31'],
      ['REP-209','Ortiz, D','West Valley','R52 ,R31','84118,84119','Restaurant','T. Askew','2025-06-01',''],
      ['REP-501','Nakamura, Rei','Wasatch North','SaltLake_031','84119','Convenience','R. Chen','2025-01-01',''],
      ['REP-322','Patel, K.','Utah County South','R58','84604,84058','Convenience','T. Askew','2025-01-01','2025-03-14'],
      ['REP-610','Holt, Casey','Boise Metro','B12,B14','83702','Grocery','R. Chen','2025-01-01',''],
      ['REP-702','Reyes, Ana','Portland Metro','P31','97202','Grocery','R. Chen','2025-01-01',''],
    ],
    issues: [
      { col: 'effective_start', type: 'conflict', desc: 'REP-114 and REP-118 ("Webb, Marcus" / "Webb, M.") both cover R27 with overlapping effective dates — stale reassignment row', severity: 'high', rows: [0,4] },
      { col: 'route_codes', type: 'format', desc: 'Comma-separated with stray spaces ("R52 ,R31", "R58, R61") and mixed ID styles ("SLC-27", "SaltLake_031") — needs parsing', severity: 'medium', rows: [0,2,5,6] },
      { col: 'sales_rep_name', type: 'normalization', desc: '"Webb, Marcus" here vs "M. Webb" in CRM; "Ortiz, D" vs "D. Ortiz" — name formats differ across systems', severity: 'medium' },
      { col: 'territory', type: 'conflict', desc: '"West Valley" (spreadsheet) vs "Wasatch North" (CRM) both claim zip 84119 — Maverik ownership ambiguous', severity: 'medium', rows: [5,6] },
      { col: 'effective_end', type: 'missing', desc: 'Most rows have open-ended assignments — mid-period reassignment only visible from overlaps', severity: 'low' },
    ]
  },

  'raw_delivery_outcomes.csv': {
    type: 'csv', source: 'TMS / POD Logs', rows: 95000, region: 'POD',
    description: 'Delivery outcomes — noisy free-text reason codes, UOM mismatches vs orders, missing order IDs and arrival times',
    headers: ['delivery_id','order_id','route_id','ship_to_id','actual_arrival_time','delivered_qty','delivered_uom','late_flag','short_flag','reason_code','driver_note'],
    data: [
      ['DEL-77111','ORD-90211','R27','ST-88213','06:42','40','CASE','N','N','',''],
      ['DEL-77112','ORD-90212','R27','ST-88213','06:42','50','CS','N','Y','short-inv','5 cs cut at DC'],
      ['DEL-77120','','SaltLake_027','ST-88377','11:05','18','Each','Y','N','late-whse','loaded late'],
      ['DEL-77128','ORD-90241','SaltLake_031','ST-71022','07:02','12','CASE','N','N','',''],
      ['DEL-77129','ORD-90242','SaltLake_031','ST-71022','07:02','4','CASE','N','Y','WH Delay','96 ea = 4 cs, partial'],
      ['DEL-77134','ORD-90255','R27','ST-64018','08:21','30','CASE','N','N','',''],
      ['DEL-77140','ORD-90263','R31','ST-59204','05:12','15','CASE','N','N','',''],
      ['DEL-77145','ORD-90271','R44','ST-45110','16:22','48','EA','N','N','','gate busy'],
      ['DEL-77149','ORD-90278','R27','ST-30761','04:55','1','PALLET','N','N','',''],
      ['DEL-77153','ORD-90284','R52','ST-20955','','10','EA','N','N','',''],
      ['DEL-77158','ORD-90290','R61','ST-17842','07:44','25','CASE','N','N','',''],
      ['DEL-77161','ORD-90297','R58','ST-15233','09:33','8','CS','Y','Y','delay at DC','inv short powerade'],
      ['DEL-77166','ORD-90301','R73','ST-12980','06:58','26','CASE','Y','N','loaded late',''],
      ['DEL-77170','ORD-90309','R58','ST-11207','10:07','6','CASE','N','N','cust closed','left with mgr'],
    ],
    issues: [
      { col: 'reason_code', type: 'normalization', desc: '"late-whse", "WH Delay", "loaded late", "delay at DC" — 4 spellings that all mean Late Warehouse Departure', severity: 'high', rows: [2,4,11,12] },
      { col: 'order_id', type: 'matching', desc: 'DEL-77120 has no order_id — but ship-to + date + SKU quantity match ORD-90228 (the sold-to order)', severity: 'high', rows: [2] },
      { col: 'late_flag', type: 'conflict', desc: '7-Eleven arrival 16:22 is past the 16:00 window but late_flag=N; Lees arrival 06:58 is inside 05:00-09:00 but late_flag=Y', severity: 'medium', rows: [7,12] },
      { col: 'delivered_uom', type: 'normalization', desc: 'Delivered UOM differs from ordered UOM (EA order delivered as CASE, CS vs CASE) — fill rate not computable', severity: 'medium', rows: [4,11] },
      { col: 'actual_arrival_time', type: 'missing', desc: 'Del Taco delivery has no actual arrival — OTIF cannot be measured for the stop', severity: 'medium', rows: [9] },
      { col: 'driver_note', type: 'format', desc: 'Free-text notes carry the real reason ("96 ea = 4 cs, partial") that the reason_code field misses', severity: 'low' },
    ]
  },

  'raw_promotion_calendar.csv': {
    type: 'csv', source: 'Trade Promotion File', rows: 1200, region: 'Promo',
    description: 'Promo periods and uplift — customer groups unmapped to outlets, SKU pack variants, overlapping dates',
    headers: ['promo_id','start_date','end_date','sku_id','customer_group','expected_uplift_pct','promo_name','sales_region'],
    data: [
      ['PRM-2201','2026-06-15','2026-07-05','SP-3300','Convenience West','35','Sprite Summer Chill','Mountain West'],
      ['PRM-2202','2026-06-22','2026-07-12','SP-3300','C-Store UT','','Sprite 20 oz PET Blitz','Wasatch'],
      ['PRM-2203','2026-07-01','2026-07-14','KO-1201','Grocery West','18','July 4 Case Stack','Mountain West'],
      ['PRM-2204','2026-07-01','2026-07-31','DA-5501','Club','12','Hydration Month','West'],
      ['PRM-2205','2026-05-01','2026-05-31','FA-4102','Grocery West','15','Fanta Flavor Fest','Mountain West'],
      ['PRM-2206','2026-07-10','2026-07-24','KO-2044','Grocery UT','','Zero Sugar Sampling','Wasatch Front'],
      ['PRM-2207','2026-06-28','2026-07-08','MM-7801','Schools Summer','20','Lemonade Stand','Utah County'],
      ['PRM-2208','2026-07-03','2026-07-18','SPR-20OZ','C-Store UT','25','Sprite Single Serve','Wasatch'],
    ],
    issues: [
      { col: 'sku_id', type: 'matching', desc: '"SPR-20OZ" does not exist in the SKU master — pack variant of SP-3300 used by trade marketing', severity: 'high', rows: [7] },
      { col: 'start_date', type: 'conflict', desc: 'Three overlapping Sprite promos (PRM-2201/2202/2208) — the 7-Eleven demand spike is promo, not baseline', severity: 'medium', rows: [0,1,7] },
      { col: 'customer_group', type: 'matching', desc: '"C-Store UT", "Convenience West", "Schools Summer" — groups have no mapping to outlet IDs', severity: 'medium' },
      { col: 'expected_uplift_pct', type: 'missing', desc: '2 of 8 promos have no expected uplift — baseline vs promo demand cannot be separated', severity: 'medium', rows: [1,5] },
      { col: 'sales_region', type: 'conflict', desc: '"Wasatch" / "Wasatch Front" / "Mountain West" differ from CRM territory names', severity: 'low' },
    ]
  },
};

// ── Golden Outlet-SKU repeat-order records ────────────────
const SWIRE_GOLDEN_RECORDS = [
  { id: 'GOS-1001', canonical_name: 'Walmart Supercenter #1482', outlet_id: 'GO-1482', channel: 'Grocery', tier: 'A',
    sku_name: 'Dasani Purified Water 24pk 16.9oz', sku_id: 'GSKU-DA-5501', brand: 'Dasani', pack: '24pk 16.9oz',
    route_id: 'R27', dc: 'SLC Distribution Center', delivery_day: 'Mon / Thu', delivery_window: '06:00-10:00',
    sales_rep: 'M. Webb (REP-114)', avg_qty_cases_8w: 41, order_frequency: 'Weekly ×2',
    suggested_next_qty_cases: 40, next_delivery: 'Thu 2026-07-09',
    repeat_order_confidence: 96, recommendation_action: 'Auto-prefill', inventory_status: 'Available — 3,880 cs at SLC',
    reason: 'Stable weekly pattern for 14 weeks; duplicate outlet records merged so full volume is visible.',
    match_confidence: 96, suppliers: ['ERP/CONA','CRM','TMS','POD'],
    source_variants: ['Walmart #1482','Wal-Mart 1482','WM Supercenter 1482','Walmart Sandy UT'],
    _lineage: [
      { source: 'raw_erp_outlet_master.csv', id: 'CUST-10231 + CUST-10457', note: 'Two ERP customers (Walmart #1482 / Wal-Mart 1482) merged — same address after standardization: 10600 S State St' },
      { source: 'raw_crm_sales_outlets.csv', id: 'CRM-5001', note: '"WM Supercenter 1482" matched by name+zip fuzzy match (94%); carries tier A and rep REP-114' },
      { source: 'raw_order_history.csv', id: 'ORD-90211 + 6 weekly orders', note: '40-42 cases of Dasani every Mon/Thu for 14 weeks — pattern visible only after outlet merge' },
      { source: 'raw_tms_route_plan.csv', id: 'SaltLake_027 stop 2', note: 'Route normalized SaltLake_027 → R27; duplicate stop ST-88377 removed from plan' },
      { source: 'raw_delivery_outcomes.csv', id: 'DEL-77111', note: 'On-time, in-full deliveries confirm the window and fill history (OTIF 97%)' },
    ]
  },
  { id: 'GOS-1002', canonical_name: 'Walmart Supercenter #1482', outlet_id: 'GO-1482', channel: 'Grocery', tier: 'A',
    sku_name: 'Coca-Cola Classic 24pk 12oz Can', sku_id: 'GSKU-KO-1201', brand: 'Coca-Cola', pack: '24pk 12oz',
    route_id: 'R27', dc: 'SLC Distribution Center', delivery_day: 'Mon / Thu', delivery_window: '06:00-10:00',
    sales_rep: 'M. Webb (REP-114)', avg_qty_cases_8w: 54, order_frequency: 'Weekly ×2',
    suggested_next_qty_cases: 55, next_delivery: 'Thu 2026-07-09',
    repeat_order_confidence: 94, recommendation_action: 'Auto-prefill', inventory_status: 'Available — 3,050 cs at SLC',
    reason: 'High-volume stable core SKU; last delivery was short 5 cases (DC cut) so suggestion holds at 55.',
    match_confidence: 96, suppliers: ['ERP/CONA','CRM','TMS','POD'],
    source_variants: ['Coca-Cola Classic 24pk 12oz','Coke Classic 24/12'],
    _lineage: [
      { source: 'raw_order_history.csv', id: 'ORD-90212', note: '55 CS ordered weekly; "CS" normalized to CASE via UOM rules' },
      { source: 'raw_delivery_outcomes.csv', id: 'DEL-77112', note: 'Delivered 50 of 55 — short_flag with reason "short-inv" mapped to Inventory Shortage' },
      { source: 'raw_inventory_snapshot.csv', id: 'SLC / KO-1201', note: '3,050 available cases — no availability risk for suggested quantity' },
    ]
  },
  { id: 'GOS-1003', canonical_name: 'Maverik #211', outlet_id: 'GO-0211', channel: 'Convenience', tier: 'B',
    sku_name: 'Coca-Cola Zero Sugar 12pk 12oz Can', sku_id: 'GSKU-KO-2044', brand: 'Coca-Cola', pack: '12pk 12oz',
    route_id: 'R31', dc: 'SLC Distribution Center', delivery_day: 'Wed', delivery_window: '06:00-10:00',
    sales_rep: 'R. Nakamura (REP-501, inferred 88%)', avg_qty_cases_8w: 12, order_frequency: 'Weekly',
    suggested_next_qty_cases: 12, next_delivery: 'Wed 2026-07-08',
    repeat_order_confidence: 88, recommendation_action: 'Sales review', inventory_status: 'Split — KOZ12PK legacy code shows -60 cs',
    reason: 'Order pattern is stable, but rep ownership was inferred from territory/route and the Zero Sugar inventory is split across legacy and new SKU codes. Review before prefill.',
    match_confidence: 88, suppliers: ['ERP/CONA','CRM','TMS','Sales Ops'],
    source_variants: ['Maverik #211','Maverik 211'],
    _lineage: [
      { source: 'raw_erp_outlet_master.csv', id: 'CUST-10389', note: 'ERP route R31; no priority tier — tier B carried from CRM' },
      { source: 'raw_crm_sales_outlets.csv', id: 'CRM-5002', note: 'sales_rep_id blank in CRM — ownership inferred from territory spreadsheet' },
      { source: 'raw_sales_rep_territory.xlsx', id: 'REP-501', note: '"Wasatch North" covers zip 84119 + route SaltLake_031 → REP-501 with 88% confidence' },
      { source: 'raw_tms_route_plan.csv', id: 'SaltLake_031 stop 1', note: 'TMS route SaltLake_031 normalized to canonical R31' },
    ]
  },
  { id: 'GOS-1004', canonical_name: 'Smiths Marketplace #087', outlet_id: 'GO-0087', channel: 'Grocery', tier: 'A',
    sku_name: 'Coca-Cola Classic 12pk 12oz Can', sku_id: 'GSKU-KO-1188', brand: 'Coca-Cola', pack: '12pk 12oz',
    route_id: 'R27', dc: 'SLC Distribution Center', delivery_day: 'Tue / Fri', delivery_window: '07:00-11:00 (filled from TMS)',
    sales_rep: 'M. Webb (REP-114)', avg_qty_cases_8w: 29, order_frequency: 'Weekly ×2',
    suggested_next_qty_cases: 30, next_delivery: 'Fri 2026-07-10',
    repeat_order_confidence: 92, recommendation_action: 'Auto-prefill', inventory_status: 'Available — 2,700 cs at SLC',
    reason: 'Standing order with 14-week stability; missing ERP delivery window was filled from the TMS route plan with lineage.',
    match_confidence: 93, suppliers: ['ERP/CONA','CRM','TMS'],
    source_variants: ['Smiths Marketplace 087',"Smith's Marketplace #087"],
    _lineage: [
      { source: 'raw_erp_outlet_master.csv', id: 'CUST-10442', note: 'delivery_window_text blank in ERP' },
      { source: 'raw_tms_route_plan.csv', id: 'R27 stop 4', note: 'Window 07:00-11:00 taken from route plan — provenance preserved on the golden record' },
      { source: 'raw_crm_sales_outlets.csv', id: 'CRM-5003', note: '"Ste B" suite difference resolved by address standardization' },
      { source: 'raw_order_history.csv', id: 'ORD-90255', note: 'Standing order, 30 cases — order_source normalized to Standing Order' },
    ]
  },
  { id: 'GOS-1005', canonical_name: 'Harmons #12 Draper', outlet_id: 'GO-0012', channel: 'Grocery', tier: 'A',
    sku_name: 'Coca-Cola Zero Sugar 12pk 12oz Can', sku_id: 'GSKU-KO-2044', brand: 'Coca-Cola', pack: '12pk 12oz',
    route_id: 'R31', dc: 'SLC Distribution Center', delivery_day: 'Wed', delivery_window: '05:00-09:00',
    sales_rep: 'D. Ortiz (REP-207)', avg_qty_cases_8w: 15, order_frequency: 'Weekly',
    suggested_next_qty_cases: 15, next_delivery: 'Wed 2026-07-08',
    repeat_order_confidence: 91, recommendation_action: 'Auto-prefill', inventory_status: 'Available after SKU merge — 1,210 cs',
    reason: 'Ordered as legacy "KOZ12PK / Coke Zero 12pk"; merged into canonical Coca-Cola Zero Sugar 12pk so quantity history is comparable.',
    match_confidence: 95, suppliers: ['ERP/CONA','CRM','TMS','SKU Master'],
    source_variants: ['KOZ12PK','CZ 12/12','Coke Zero 12pk','Coke Zero 12pk 12oz'],
    _lineage: [
      { source: 'raw_sku_master.csv', id: 'KOZ12PK → KO-2044', note: 'Legacy and new SKU merged into one canonical Zero Sugar 12pk (95% pack match)' },
      { source: 'raw_order_history.csv', id: 'ORD-90263', note: '"Case" normalized to CASE; 15 cases weekly for 11 of 14 weeks' },
      { source: 'raw_inventory_snapshot.csv', id: 'SLC / KOZ12PK + KO-2044', note: 'Split availability (-60 legacy / 1,210 new) reconciled under the canonical SKU' },
    ]
  },
  { id: 'GOS-1006', canonical_name: '7-Eleven #33412 Murray', outlet_id: 'GO-3341', channel: 'Convenience', tier: 'B',
    sku_name: 'Sprite 20oz PET Bottle', sku_id: 'GSKU-SP-3300', brand: 'Sprite', pack: '20oz single',
    route_id: 'R44', dc: 'SLC Distribution Center', delivery_day: 'Fri', delivery_window: '12:00-16:00',
    sales_rep: 'D. Ortiz (REP-207)', avg_qty_cases_8w: 2, order_frequency: 'Irregular (promo spike ×6)',
    suggested_next_qty_cases: 0, next_delivery: '—',
    repeat_order_confidence: 41, recommendation_action: 'Do not suggest', inventory_status: 'Low — 20 cs at SLC',
    reason: 'Current volume is driven by three overlapping Sprite promotions, and SLC stock is low. Baseline demand is ~2 cases; auto-prefilling the promo spike would overstock the outlet.',
    match_confidence: 90, suppliers: ['ERP/CONA','Promo File','Inventory'],
    source_variants: ['Sprite 20oz','Sprite 20oz PET','SPR-20OZ','Sprite 20 oz PET'],
    _lineage: [
      { source: 'raw_order_history.csv', id: 'ORD-90271', note: '48 Each = 2 cases after UOM conversion (24 units/case) — spike vs 8-week baseline' },
      { source: 'raw_promotion_calendar.csv', id: 'PRM-2201/2202/2208', note: 'Three overlapping Sprite promos cover the order window; "SPR-20OZ" mapped to canonical SKU' },
      { source: 'raw_inventory_snapshot.csv', id: 'SLC / SP-3300', note: 'Only 20 available cases — shortage risk if the spike is auto-replicated' },
    ]
  },
  { id: 'GOS-1007', canonical_name: 'Costco Wholesale #687', outlet_id: 'GO-0687', channel: 'Club', tier: 'A',
    sku_name: 'Dasani Purified Water 24pk 16.9oz', sku_id: 'GSKU-DA-5501', brand: 'Dasani', pack: '24pk 16.9oz',
    route_id: 'R27', dc: 'SLC Distribution Center', delivery_day: 'Fri', delivery_window: '04:00-08:00',
    sales_rep: 'M. Webb (REP-114)', avg_qty_cases_8w: 84, order_frequency: 'Weekly (1 pallet)',
    suggested_next_qty_cases: 84, next_delivery: 'Fri 2026-07-10',
    repeat_order_confidence: 95, recommendation_action: 'Auto-prefill', inventory_status: 'Available — 3,880 cs at SLC',
    reason: 'Orders arrive as "1 Pallet"; converted to 84 cases via pallet rules. Perfectly stable club-channel water volume.',
    match_confidence: 97, suppliers: ['ERP/CONA','CRM','TMS','POD'],
    source_variants: ['DASANI WATER 24PK','Dasani 24pk 16.9oz','Dasani 24pk'],
    _lineage: [
      { source: 'raw_order_history.csv', id: 'ORD-90278', note: '"1 Pallet" converted: 1 pallet = 84 cases (unit_per_case × layer rules)' },
      { source: 'raw_delivery_outcomes.csv', id: 'DEL-77149', note: 'Delivered on time at 04:55 inside the 04:00-08:00 club window' },
      { source: 'raw_tms_route_plan.csv', id: 'SaltLake_027 stop 1', note: 'First stop on the normalized R27 route from SLC' },
    ]
  },
  { id: 'GOS-1008', canonical_name: 'Alpine School District Nutrition Svcs', outlet_id: 'GO-1784', channel: 'School', tier: 'B',
    sku_name: 'Minute Maid Lemonade 12pk 12oz', sku_id: 'GSKU-MM-7801', brand: 'Minute Maid', pack: '12pk 12oz',
    route_id: 'R61', dc: 'SLC Distribution Center', delivery_day: 'Thu', delivery_window: '07:00-11:00',
    sales_rep: 'K. Patel (REP-311)', avg_qty_cases_8w: 24, order_frequency: 'Weekly (term-time)',
    suggested_next_qty_cases: 12, next_delivery: 'Thu 2026-07-09',
    repeat_order_confidence: 72, recommendation_action: 'Sales review', inventory_status: 'Available — 640 cs at PDX, 0 local',
    reason: 'School calendar breaks the weekly pattern (summer session at 50% volume) and a "Lemonade Stand" promo overlaps. Rep should confirm summer quantity.',
    match_confidence: 92, suppliers: ['ERP/CONA','CRM','Promo File'],
    source_variants: ['Alpine SD Nutrition Svcs','Alpine School District'],
    _lineage: [
      { source: 'raw_order_history.csv', id: 'ORD-90290', note: '25 cases weekly during term; summer weeks drop to 10-14' },
      { source: 'raw_promotion_calendar.csv', id: 'PRM-2207', note: '"Schools Summer" promo group matched to school-channel outlets by channel rules' },
      { source: 'raw_crm_sales_outlets.csv', id: 'CRM-5008', note: '"Alpine School District" matched to ERP "Alpine SD Nutrition Svcs" via address+zip (91%)' },
    ]
  },
  { id: 'GOS-1009', canonical_name: 'Top Stop #8 Provo', outlet_id: 'GO-0008', channel: 'Convenience', tier: 'C',
    sku_name: 'Powerade Mountain Berry Blast 8pk', sku_id: 'GSKU-PW-6600', brand: 'Powerade', pack: '8pk 20oz',
    route_id: 'R58', dc: 'SLC Distribution Center', delivery_day: 'Tue', delivery_window: 'Unknown — missing in ERP and TMS',
    sales_rep: 'K. Patel (REP-311)', avg_qty_cases_8w: 13, order_frequency: 'Weekly',
    suggested_next_qty_cases: 0, next_delivery: 'Hold',
    repeat_order_confidence: 76, recommendation_action: 'Data fix needed', inventory_status: 'Conflict — Boise shows -20 cs (stale, 2 days old)',
    reason: 'Order pattern is fine, but the delivery window is missing in both systems, the last delivery was late+short, and the only regional stock signal is negative and stale. Fix the data before automating.',
    match_confidence: 90, suppliers: ['ERP/CONA','TMS','Inventory','POD'],
    source_variants: ['Top Stop #8','Top Stop Provo #8'],
    _lineage: [
      { source: 'raw_erp_outlet_master.csv', id: 'CUST-10701', note: 'delivery_window_text blank in ERP' },
      { source: 'raw_tms_route_plan.csv', id: 'R58 stop 1', note: 'Window blank in TMS too — flagged as Data fix needed, not inferable' },
      { source: 'raw_inventory_snapshot.csv', id: 'BOI / PW-6600', note: '-20 available cases, snapshot 2 days stale — availability unknown' },
      { source: 'raw_delivery_outcomes.csv', id: 'DEL-77161', note: 'Late + short with reason "delay at DC" → Late Warehouse Departure' },
    ]
  },
];

// ── Canonical schema for the mapping stage ────────────────
const SWIRE_CANONICAL_FIELDS = [
  { name: 'canonical_outlet_id', type: 'string', required: true,
    source: 'customer_id + ship_to_id (ERP) + crm_account_id (CRM) + ship_to_id (TMS) + ship_to_id (POD)',
    logic: 'Exact ship-to join where IDs agree; otherwise name+address+zip fuzzy match and sold-to/ship-to hierarchy. One golden ID per physical delivery location.',
    samples: ['GO-1482','GO-0211','GO-0087','GO-0687'] },
  { name: 'outlet_name_canonical', type: 'string', required: true,
    source: 'customer_name (ERP) + outlet_name (CRM)',
    logic: '"Walmart #1482", "Wal-Mart 1482", "WM Supercenter 1482" all resolve to "Walmart Supercenter #1482" via banner dictionary + store number extraction.',
    samples: ['Walmart Supercenter #1482','Maverik #211','Smiths Marketplace #087'] },
  { name: 'canonical_sku_id', type: 'string', required: true,
    source: 'sku_id (SKU master) + sku_id (orders) + sku_id (inventory) + sku_id (promo)',
    logic: 'GTIN exact match first; then description+brand+pack synonym match. Legacy KOZ12PK and promo alias SPR-20OZ fold into their canonical SKUs.',
    samples: ['GSKU-KO-2044','GSKU-SP-3300','GSKU-DA-5501'] },
  { name: 'order_qty_cases', type: 'float', required: true,
    source: 'order_qty + order_uom (orders) + delivered_qty + delivered_uom (POD)',
    logic: 'All quantities normalized to cases using unit_per_case: 96 EA ÷ 24 = 4 cases; 1 pallet = 84 cases. CASE/CS/cases/Case unified.',
    samples: ['40','4 (from 96 EA)','84 (from 1 pallet)'] },
  { name: 'route_id', type: 'string', required: false,
    source: 'default_route_code (ERP) + route_id (TMS) + route_codes (territory file)',
    logic: '"SLC-27", "R27", "SaltLake_027" all normalize to canonical "R27" via route registry pattern rules.',
    samples: ['R27','R31','R44','R58'] },
  { name: 'dc_id', type: 'string', required: false,
    source: 'dc_code (ERP) + dc_id (TMS) + dc_id (inventory)',
    logic: '"SLC", "Salt Lake City DC", "UT-DC-01" resolve to "SLC Distribution Center". Six canonical DCs: SLC, Denver, Phoenix, Seattle, Boise, Portland.',
    samples: ['SLC Distribution Center','Denver DC','Boise DC'] },
  { name: 'delivery_window_start_end', type: 'time', required: false,
    source: 'delivery_window_text (ERP) + delivery_window_start/end (TMS)',
    logic: '"Morning", "6-10", "06:00 AM - 10:00 AM" parse to 06:00-10:00. When ERP is blank, TMS window fills the gap with lineage. Conflicts flagged for review.',
    samples: ['06:00-10:00','04:00-08:00','07:00-11:00'] },
  { name: 'sales_rep_id', type: 'string', required: false,
    source: 'sales_rep_id (CRM) + territory mapping (Sales Ops spreadsheet)',
    logic: 'CRM value wins when present. When blank, inferred from territory + route + zip overlap with a confidence score; inferred reps route to Sales review.',
    samples: ['REP-114','REP-207','REP-501 (inferred)'] },
];

const SWIRE_MAPPINGS = [
  { canonical: 'canonical_outlet_id', sources: ['customer_id/ship_to_id (ERP)','crm_account_id (CRM)','ship_to_id (TMS/POD)'], confidence: 0.94 },
  { canonical: 'outlet_name_canonical', sources: ['customer_name (ERP)','outlet_name (CRM)'], confidence: 0.92 },
  { canonical: 'canonical_sku_id', sources: ['sku_id + gtin (SKU master)','sku_id (orders/inventory/promo)'], confidence: 0.90 },
  { canonical: 'order_qty_cases', sources: ['order_qty + order_uom (orders)','delivered_qty + delivered_uom (POD)'], confidence: 0.96 },
  { canonical: 'route_id', sources: ['default_route_code (ERP)','route_id (TMS)','route_codes (territory)'], confidence: 0.86 },
  { canonical: 'dc_id', sources: ['dc_code (ERP)','dc_id (TMS/inventory)'], confidence: 0.91 },
  { canonical: 'delivery_window_start_end', sources: ['delivery_window_text (ERP)','delivery_window_start/end (TMS)'], confidence: 0.78 },
  { canonical: 'sales_rep_id', sources: ['sales_rep_id (CRM)','—inferred from territory/route/zip—'], confidence: 0.74 },
];

// ── Self-healing exceptions ───────────────────────────────
const SWIRE_HARMONIZATION_ISSUES = [
  { id: 'sw-1', type: 'matching', description: 'Merge Walmart Sandy — 2 ERP customers + CRM variant = 1 golden outlet', confidence: 0.96, resolved: false,
    before: { records: ['CUST-10231 "Walmart #1482" (ERP)','CUST-10457 "Wal-Mart 1482" (ERP)','CRM-5001 "WM Supercenter 1482" (CRM)'], addresses: ['10600 S State St','10600 South State Street','10600 S State'] },
    after: { golden_outlet_id: 'GO-1482', outlet_name_canonical: 'Walmart Supercenter #1482', address_canonical: '10600 S State St, Sandy UT 84070', merged: 3 },
    reasoning: 'Address standardization ("South State Street" → "S State St") makes all three records identical on address+zip. Name fuzzy match scores 0.94 across the banner variants and both records share sold-to WMT-CORP-001. Merging reveals the full order volume that was split across two customer IDs — the duplicate TMS stop ST-88377 is retired.' },
  { id: 'sw-2', type: 'matching', description: 'Merge Coke Zero SKUs — KOZ12PK legacy + KO-2044 + "CZ 12/12" order alias', confidence: 0.95, resolved: false,
    before: { records: ['KOZ12PK "Coke Zero 12pk 12oz" (SKU master, legacy, no GTIN)','KO-2044 "Coca-Cola Zero Sugar 12pk 12oz Can"','"CZ 12/12" (order descriptions)'] },
    after: { canonical_sku_id: 'GSKU-KO-2044', sku_name_canonical: 'Coca-Cola Zero Sugar 12pk 12oz', pack: '12pk 12oz Can', merged: 3 },
    reasoning: 'Brand ("KO" → Coca-Cola), flavor (Zero = Zero Sugar), pack (12 pk / 12pk) and container (12 oz / 12oz) all align. Order alias "CZ 12/12" matches on brand-initial + pack pattern. After the merge, Maverik and Harmons order history becomes one comparable quantity series and the split inventory (-60 legacy / 1,210 new) reconciles.' },
  { id: 'sw-3', type: 'normalization', description: 'Normalize route IDs — SLC-27, R27, SaltLake_027 → R27', confidence: 0.97, resolved: false,
    before: { values: ['SLC-27','SaltLake_027','R27'] },
    after: { canonical: 'R27', rule: 'Strip DC prefix, zero-pad digits, map to route registry (SaltLake_031 → R31 same rule)' },
    reasoning: 'ERP uses "SLC-27" and "R27" while TMS emits "SaltLake_027" for the same truck/driver/DC. Pattern rule extracts the numeric route and joins against the route registry; the same rule resolves SaltLake_031 → R31. Without this, route-level OTIF and outlet-route joins silently drop stops.' },
  { id: 'sw-4', type: 'normalization', description: 'Normalize delivery windows — "Morning", "6-10", "06:00 AM - 10:00 AM" → 06:00-10:00', confidence: 0.93, resolved: false,
    before: { values: ['Morning','6-10','06:00 AM - 10:00 AM'] },
    after: { canonical: '06:00-10:00', parsed: 5, filled_from_tms: 1, unresolved: 1 },
    reasoning: '"Morning" maps to the 06:00-10:00 band by DC policy; numeric shorthand "6-10" parses with AM inference from route type. Smiths #087 (blank in ERP) is filled from the TMS route plan with lineage. Top Stop #8 is blank in both systems → routed to Data fix needed.' },
  { id: 'sw-5', type: 'normalization', description: 'Normalize reason codes — late-whse / WH Delay / loaded late / delay at DC → Late Warehouse Departure', confidence: 0.91, resolved: false,
    before: { values: ['late-whse','WH Delay','loaded late','delay at DC'] },
    after: { canonical: 'Late Warehouse Departure', vocabulary: 'Inventory Shortage · Late Warehouse Departure · Route Delay · Receiving Window · Customer Closed · Other' },
    reasoning: 'Free-text POD reasons cluster into a 6-value canonical vocabulary via synonym dictionary. This is what makes OTIF root-cause analytics possible — today 4 spellings of the same warehouse delay are counted as 4 different problems.' },
  { id: 'sw-6', type: 'validation', description: 'Convert UOMs to cases — 96 EA → 4 cases, 1 Pallet → 84 cases', confidence: 0.98, resolved: false,
    before: { rows: ['ORD-90242: 96 EA Sprite 20oz','ORD-90278: 1 Pallet Dasani 24pk','ORD-90212: 55 CS Coke Classic'] },
    after: { rows: ['4.0 cases (96 ÷ 24 unit_per_case)','84.0 cases (pallet rule)','55.0 cases (CS = CASE)'], canonical_uom: 'CASE' },
    reasoning: 'unit_per_case from the SKU master drives each conversion; pallet factors come from the pack registry. Once everything is in cases, the 8-week average and suggested next quantity become mathematically meaningful.' },
  { id: 'sw-7', type: 'enrichment', description: 'Infer missing sales rep for Maverik #211 from territory + route + zip', confidence: 0.88, resolved: false,
    before: { crm_record: 'CRM-5002 Maverik 211', sales_rep_id: '(blank)', territory: 'Wasatch North' },
    after: { sales_rep_id: 'REP-501', sales_rep: 'R. Nakamura', method: 'territory zip 84119 + route SaltLake_031 overlap', confidence_note: 'Inferred — routed to Sales review, not auto-prefill' },
    reasoning: 'The territory spreadsheet maps "Wasatch North" (zip 84119, route SaltLake_031) to REP-501. A competing "West Valley" row also claims 84119, which is why confidence is 88% and the recommendation stays at Sales review instead of auto-prefill.' },
  { id: 'sw-8', type: 'enrichment', description: 'Fill Smiths #087 delivery window from TMS route plan', confidence: 0.92, resolved: false,
    before: { erp_window: '(blank)', tms_window: '07:00-11:00 (R27 stop 4)' },
    after: { delivery_window: '07:00-11:00', source: 'TMS route plan', lineage: 'raw_tms_route_plan.csv row 4' },
    reasoning: 'ERP has no window but the outlet has been served 07:00-11:00 on R27 for 14 straight weeks in the TMS plan, with POD arrivals averaging 08:15. The window is filled from TMS and the provenance is kept on the golden record.' },
  { id: 'sw-9', type: 'validation', description: 'Flag impossible inventory — negative availability + stale snapshots', confidence: 0.99, resolved: false,
    before: { rows: ['SLC / KOZ12PK: available -60 cs','BOI / PW-6600: available -20 cs (snapshot 2 days old)'] },
    after: { action: 'KOZ12PK negative resolves via SKU merge with KO-2044 (net +1,150). Boise Powerade flagged Data fix needed — stale + negative cannot be trusted.', freshness_rule: 'Snapshots older than 24h are excluded from prefill decisions' },
    reasoning: 'Negative availability means allocation exceeded on-hand — usually a symptom of the same product being decremented under two SKU codes. The legacy/new merge fixes the SLC case; Boise remains unexplained and blocks automation for Top Stop #8 until refreshed.' },
];

// ── Merge clusters shown above the workbench ──────────────
const SWIRE_MERGE_CLUSTERS = [
  { kind: 'Outlet', name: 'Walmart Supercenter #1482', confidence: 96, golden: 'GO-1482', issueId: 'sw-1',
    members: [
      { src: 'ERP', id: 'CUST-10231', label: 'Walmart #1482' },
      { src: 'ERP', id: 'CUST-10457', label: 'Wal-Mart 1482' },
      { src: 'CRM', id: 'CRM-5001', label: 'WM Supercenter 1482' },
      { src: 'TMS', id: 'ST-88377', label: 'duplicate stop' },
    ],
    why: 'Same address after standardization + shared sold-to + name fuzzy 0.94' },
  { kind: 'Outlet', name: 'Smiths Marketplace #087', confidence: 93, golden: 'GO-0087', issueId: 'sw-8',
    members: [
      { src: 'ERP', id: 'CUST-10442', label: 'Smiths Marketplace 087' },
      { src: 'CRM', id: 'CRM-5003', label: "Smith's Marketplace #087 (Ste B)" },
      { src: 'TMS', id: 'R27 stop 4', label: 'window donor' },
    ],
    why: 'Address+zip match; suite suffix dropped; window filled from TMS' },
  { kind: 'Outlet', name: 'Maverik #211', confidence: 88, golden: 'GO-0211', issueId: 'sw-7',
    members: [
      { src: 'ERP', id: 'CUST-10389', label: 'Maverik #211' },
      { src: 'CRM', id: 'CRM-5002', label: 'Maverik 211 (no rep)' },
      { src: 'TMS', id: 'SaltLake_031', label: 'route variant' },
    ],
    why: 'Exact address; rep inferred from territory file → Sales review' },
  { kind: 'SKU', name: 'Coca-Cola Zero Sugar 12pk 12oz', confidence: 95, golden: 'GSKU-KO-2044', issueId: 'sw-2',
    members: [
      { src: 'SKU', id: 'KO-2044', label: 'new SKU' },
      { src: 'SKU', id: 'KOZ12PK', label: 'legacy, no GTIN' },
      { src: 'ORD', id: 'CZ 12/12', label: 'order alias' },
    ],
    why: 'Brand+flavor+pack alignment; reconciles split inventory' },
  { kind: 'SKU', name: 'Sprite 20oz PET Bottle', confidence: 90, golden: 'GSKU-SP-3300', issueId: 'sw-2',
    members: [
      { src: 'SKU', id: 'SP-3300', label: 'master' },
      { src: 'PRM', id: 'SPR-20OZ', label: 'promo alias' },
      { src: 'ORD', id: 'Sprite 20oz PET', label: 'description variant' },
    ],
    why: 'Promo alias + description variants fold into one canonical single-serve SKU' },
];

// ── Business impact summary ───────────────────────────────
const SWIRE_IMPACT = {
  raw_records: 250850, sampled_rows: 114, source_files: 9,
  raw_outlets: 3500, golden_outlets: 2850, duplicate_reduction_pct: 19,
  raw_skus: 850, golden_skus: 720,
  order_rows: 120000, repeat_patterns: 38200,
  matched_orders_before_pct: 87, matched_orders_after_pct: 99,
  quality_before: 89, quality_after: 97,
  auto_prefill_pct: 42, sales_review_pct: 31, do_not_suggest_pct: 27,
  auto_prefill_candidates: 16044, sales_review_needed: 11842, data_fix_needed: 1310,
  rep_hours_saved_weekly: 6.5,
};

// ── Search / impact split-view data ───────────────────────
const SWIRE_SEARCH_DATA = {
  'walmart': {
    goldenIds: ['GOS-1001','GOS-1002'],
    raw: [
      { source: 'ERP / CONA', name: 'Walmart #1482', id: 'CUST-10231', issues: ['One of two customer IDs for the same store'] },
      { source: 'ERP / CONA', name: 'Wal-Mart 1482', id: 'CUST-10457', issues: ['Duplicate ship-to ST-88377','Route code "SLC-27" ≠ TMS'] },
      { source: 'CRM', name: 'WM Supercenter 1482', id: 'CRM-5001', issues: ['Informal banner abbreviation'] },
      { source: 'Order History', name: 'WMT-CORP-001 (sold-to order)', id: 'ORD-90228', issues: ['No ship-to — which Walmart?'] },
      { source: 'TMS', name: 'ST-88377 stop', id: 'SaltLake_027 #3', issues: ['Ghost stop, no planned arrival'] },
    ],
    headline: '5 fragments across 4 systems → 1 golden outlet with 2 auto-prefill repeat orders' },
  'maverik': {
    goldenIds: ['GOS-1003'],
    raw: [
      { source: 'ERP / CONA', name: 'Maverik #211', id: 'CUST-10389', issues: ['No priority tier','Window "6-10" shorthand'] },
      { source: 'CRM', name: 'Maverik 211', id: 'CRM-5002', issues: ['sales_rep_id blank'] },
      { source: 'TMS', name: 'ST-71022 on SaltLake_031', id: 'SaltLake_031 #1', issues: ['Route ID ≠ ERP "R31"'] },
    ],
    headline: 'Rep inferred at 88% from the territory file — routed to Sales review, not blind automation' },
  'smiths': {
    goldenIds: ['GOS-1004'],
    raw: [
      { source: 'ERP / CONA', name: 'Smiths Marketplace 087', id: 'CUST-10442', issues: ['Delivery window missing'] },
      { source: 'CRM', name: "Smith's Marketplace #087", id: 'CRM-5003', issues: ['Apostrophe + "Ste B" suite variant'] },
      { source: 'TMS', name: 'R27 stop 4', id: 'TRK-212', issues: ['Has the window ERP lacks: 07:00-11:00'] },
    ],
    headline: 'Missing ERP window filled from the TMS route plan — with lineage, so planners can trust it' },
  'coke zero': {
    goldenIds: ['GOS-1005','GOS-1003'],
    raw: [
      { source: 'SKU Master', name: 'Coke Zero 12pk 12oz', id: 'KOZ12PK', issues: ['Legacy code, no GTIN, brand "KO"'] },
      { source: 'SKU Master', name: 'Coca-Cola Zero Sugar 12pk 12oz Can', id: 'KO-2044', issues: ['New code for the same item'] },
      { source: 'Order History', name: 'CZ 12/12', id: 'ORD-90228', issues: ['Cryptic order alias'] },
      { source: 'Inventory', name: 'KOZ12PK at SLC', id: 'available: -60', issues: ['Negative — allocation split across codes'] },
    ],
    headline: '3 identities and a negative stock position → 1 canonical SKU with comparable history' },
  'sprite': {
    goldenIds: ['GOS-1006'],
    raw: [
      { source: 'Order History', name: 'Sprite 20oz PET — 48 Each', id: 'ORD-90271', issues: ['Promo-week spike, EA units'] },
      { source: 'Promo File', name: 'SPR-20OZ (Sprite Single Serve)', id: 'PRM-2208', issues: ['SKU alias not in master'] },
      { source: 'Promo File', name: 'Sprite Summer Chill / PET Blitz', id: 'PRM-2201/2202', issues: ['Overlapping promo dates'] },
      { source: 'Inventory', name: 'SP-3300 at SLC', id: 'available: 20', issues: ['Low stock'] },
    ],
    headline: 'Promo spike + low stock detected → recommendation suppressed. The system does not blindly automate.' },
  'dasani': {
    goldenIds: ['GOS-1001','GOS-1007'],
    raw: [
      { source: 'Order History', name: 'Dasani 24pk 16.9oz — 40 CASE', id: 'ORD-90211', issues: [] },
      { source: 'Order History', name: 'DASANI WATER 24PK — 1 Pallet', id: 'ORD-90278', issues: ['All-caps + pallet UOM'] },
      { source: 'Order History', name: 'Dasani 24pk — 22 CS', id: 'ORD-90256', issues: ['Late edit after cutoff'] },
    ],
    headline: 'Stable water volume across Grocery + Club — the cleanest auto-prefill candidates in the dataset' },
};

// ── Guided demo script ────────────────────────────────────
const SWIRE_DEMO_SCRIPT = [
  { page: 'raw', highlight: '.stats-grid', action: null,
    narration: 'Welcome to <strong>Swire Repeat Order Intelligence</strong>. Nine operational files — ERP outlets, CRM, orders, SKU master, routes, inventory, territories, deliveries, promos — about <em>250,000 source records</em>, sampled here for the walkthrough.', stepLabel: 'Step 1 of 12 — Source Landscape', duration: 5500 },
  { page: 'raw', highlight: '.source-file-card:nth-child(1)', action: () => { selectFile('raw_erp_outlet_master.csv'); },
    narration: 'The <strong>ERP outlet master</strong>: Walmart Sandy exists twice — "Walmart #1482" and "Wal-Mart 1482" — under two customer IDs. Delivery windows read "Morning", "6-10", "06:00-10:00". A closed diner is still marked active.', stepLabel: 'Step 2 of 12 — Outlet Duplication', duration: 6000 },
  { page: 'raw', highlight: '.source-file-card:nth-child(3)', action: () => { selectFile('raw_order_history.csv'); },
    narration: '<strong>Order history</strong>: one column holds CASE, CS, cases, EA, Each, and Pallet. One order is attached to the corporate <em>sold-to</em> with no ship-to. "CZ 12/12" hides a Coke Zero repeat pattern.', stepLabel: 'Step 3 of 12 — Order Chaos', duration: 6000 },
  { page: 'raw', highlight: '.source-file-card:nth-child(6)', action: () => { selectFile('raw_inventory_snapshot.csv'); },
    narration: '<strong>Inventory</strong>: negative availability (-60 cases of legacy Coke Zero), snapshots two days stale in Boise, and six spellings of "available". Order cutoff decisions run on this.', stepLabel: 'Step 4 of 12 — Inventory Trust Gap', duration: 5500 },
  { page: 'mapping', highlight: '.canonical-item', action: null,
    narration: 'Every source column maps into one <strong>canonical Outlet-SKU-Route model</strong> — golden outlet ID, canonical SKU, quantities in cases, normalized routes, windows, and rep ownership.', stepLabel: 'Step 5 of 12 — Canonical Model', duration: 4500 },
  { page: 'mapping', highlight: '.table-wrapper tbody tr:nth-child(7)', action: () => { state.autoMapped = true; renderAll(); },
    narration: '<strong>Auto-Map</strong> scores each mapping. Delivery windows land at <em>78%</em> and rep ownership at <em>74%</em> — exactly the fields a human should approve before trusting automation.', stepLabel: 'Step 6 of 12 — Auto-Mapping', duration: 5500 },
  { page: 'workbench', highlight: '.swire-cluster-strip', action: null,
    narration: 'The <strong>merge queue</strong>: Walmart collapses 4 records into one outlet at 96%. Legacy KOZ12PK and new KO-2044 fold into one Coca-Cola Zero Sugar SKU at 95%. Every merge shows its reason.', stepLabel: 'Step 7 of 12 — Merge Clusters', duration: 6000 },
  { page: 'workbench', highlight: '.diff-grid', action: () => { state.activeIssueTab = 'enrichment'; selectIssue('sw-7'); },
    narration: 'Maverik #211 has <strong>no sales rep in CRM</strong>. The engine infers REP-501 from territory, route, and zip — at 88%, so it routes to <em>Sales review</em> instead of silent automation.', stepLabel: 'Step 8 of 12 — Rep Inference', duration: 6000 },
  { page: 'workbench', highlight: '.btn-emerald-outline', action: () => { reRunWithRules(); },
    narration: '<strong>Re-run with Rules</strong> auto-accepts everything above 90% confidence — UOM conversions, route normalization, the Walmart merge. Humans keep the low-confidence calls.', stepLabel: 'Step 9 of 12 — Rules Engine', duration: 5000 },
  { page: 'golden', highlight: '.lineage-timeline', action: () => { state.selectedRecordId = 'GOS-1001'; renderAll(); },
    narration: 'The <strong>golden Outlet-SKU dataset</strong>: Walmart Supercenter #1482 × Dasani 24pk — 40 cases, twice weekly, 96% repeat confidence, <em>auto-prefill</em>. Full lineage back to ERP, CRM, TMS, and POD.', stepLabel: 'Step 10 of 12 — Golden Records', duration: 7000 },
  { page: 'search', highlight: '.swire-impact-tiles', action: () => { state.searchQuery = 'sprite'; renderAll(); },
    narration: 'And the guardrail: <strong>Sprite 20oz at 7-Eleven</strong> is a promo spike on low stock — confidence 41%, recommendation <em>suppressed</em>. 42% auto-prefill, 31% sales review, 27% not suggested.', stepLabel: 'Step 11 of 12 — Smart Suppression', duration: 6500 },
  { page: 'search', highlight: '.swire-impact-tiles', action: () => { state.searchQuery = 'walmart'; renderAll(); },
    narration: '<strong>The takeaway:</strong> no WMS required. Connect the data Swire already has, resolve the messy joins, and a golden Outlet-SKU dataset powers repeat-order automation reps can actually trust.', stepLabel: 'Step 12 of 12 — Business Impact', duration: 7000 },
];

// ── Stage intros / storyline / help copy ──────────────────
const SWIRE_PAGE_INTROS = {
  raw: { title: 'Stage 1 - Ingest and Profile', desc: 'Nine operational files land from ERP/CONA, CRM, order management, the SKU master, TMS routing, inventory, sales ops, POD logs, and trade promotions. The profiler exposes duplicate outlets, mixed units, conflicting windows, and stale flags <strong>before anything is cleaned</strong>.' },
  mapping: { title: 'Stage 2 - Canonical Outlet-SKU-Route Model', desc: 'customer_no, outlet_id, sold_to, ship_to and store numbers all map to <strong>one canonical outlet identity</strong>; SKU codes, aliases, and pack variants map to canonical SKUs; routes, DCs, windows, and quantities normalize into a single shared model.' },
  workbench: { title: 'Stage 3 - Self-Healing with Approval', desc: 'The engine proposes merges and fixes with confidence scores: <strong>duplicate outlets collapse</strong>, legacy SKUs fold into new codes, UOMs convert to cases, missing reps and windows are inferred from route context. Every proposal shows its evidence and waits for approval.' },
  golden: { title: 'Stage 4 - Golden Outlet-SKU Dataset', desc: 'One trusted row per Outlet × SKU: typical quantity, order cadence, next delivery, route, DC, inventory availability, repeat-order confidence, and a recommended action — <strong>auto-prefill, sales review, do not suggest, or data fix needed</strong> — each with lineage.' },
  search: { title: 'Stage 5 - Repeat-Order Impact', desc: 'Search any outlet or SKU and compare the fragmented raw view with the golden view. Then see the business math: <strong>fewer duplicate outlets, more matched orders, higher repeat-order coverage</strong>, and reps who spend time on exceptions instead of re-keying.' },
};

const SWIRE_STORYLINES = {
  raw: { intro: 'We load the operational files a bottler already has — no WMS required — and profile them before any cleaning.',
    steps: [
      { label: 'What comes in', text: 'ERP outlet master, CRM outlet list, order history, SKU master, TMS route plan, inventory snapshot, territory mapping, delivery outcomes, and the promo calendar.' },
      { label: 'Checks we run', text: 'Duplicate ship-tos, mixed delivery window formats, UOM chaos, route ID variants, negative inventory, stale snapshots, and noisy reason codes.' },
      { label: 'What goes forward', text: 'A profiled raw layer with issue counts, quality scores, and the evidence needed to match outlets and SKUs.' },
    ] },
  mapping: { intro: 'Every source field maps into one canonical Outlet-SKU-Route model so records from different systems can be joined safely.',
    steps: [
      { label: 'What comes in', text: 'Customer, ship-to, and account IDs; SKU codes and aliases; route codes, DC names, windows, quantities, and rep assignments in nine different shapes.' },
      { label: 'Work we do', text: 'Map to canonical_outlet_id, outlet_name_canonical, canonical_sku_id, order_qty_cases, route_id, dc_id, delivery windows, and sales_rep_id with confidence scores.' },
      { label: 'What goes forward', text: 'One shared model where "Walmart #1482" and "WM Supercenter 1482" are comparable rows, not different customers.' },
    ] },
  workbench: { intro: 'Merges and fixes are proposed with evidence and confidence — a person approves before the golden dataset is built.',
    steps: [
      { label: 'What comes in', text: 'Outlet and SKU merge clusters, UOM conversions, route/window/reason-code normalizations, and inference candidates for missing reps and windows.' },
      { label: 'Work we do', text: 'Approve high-confidence merges, review inferred fields, convert quantities to cases, and flag data that cannot be trusted (negative, stale inventory).' },
      { label: 'What goes forward', text: 'Approved, explainable fixes — each one traceable to the raw rows that justified it.' },
    ] },
  golden: { intro: 'Cleaned records join into golden outlets, golden SKUs, and the core product: golden Outlet-SKU repeat-order rows.',
    steps: [
      { label: 'What comes in', text: 'Merged outlets, canonical SKUs, case-normalized order history, normalized routes and windows, and reconciled inventory.' },
      { label: 'Work we do', text: 'Compute 8-week averages, order cadence, next delivery day, suggested quantity, repeat-order confidence, and a recommended action per Outlet × SKU.' },
      { label: 'What goes forward', text: 'A trusted repeat-order dataset with lineage — ready to pre-fill orders, guide reps, and explain OTIF.' },
    ] },
  search: { intro: 'The proof: the same outlet search before and after, plus the portfolio-level business impact of the golden dataset.',
    steps: [
      { label: 'What comes in', text: 'A query like "walmart" or "coke zero" runs against the raw fragments and against the golden Outlet-SKU records.' },
      { label: 'What changes', text: 'Raw shows duplicate customers, ghost stops, sold-to orphans, and SKU aliases. Golden shows one outlet, one SKU, one recommendation with confidence.' },
      { label: 'What this proves', text: '42% of Outlet-SKU pairs are safe to auto-prefill, 31% get targeted sales review, 27% are correctly held back — and reps keep control.' },
    ] },
};

const SWIRE_PAGE_HELP = {
  raw: { title: 'Raw Swire Source Data', summary: 'These are the nine operational files as they arrive from ERP, CRM, routing, inventory, sales ops, delivery logs, and trade promotion — nothing cleaned yet.',
    sections: [
      { title: 'What you can do here', items: [
        'See how many files, records, and data issues came in across the four source domains.',
        'Open any file card to inspect its rows with problem cells highlighted.',
        'Use the heatmap to spot which files carry critical issues vs warnings.' ] },
      { title: 'What to look for', items: [
        'Walmart Sandy appears twice in ERP under different customer IDs.',
        'Delivery windows appear as "Morning", "6-10", and "06:00-10:00" in the same column.',
        'Inventory shows negative availability and two-day-old snapshots.' ] },
      { title: 'Why it matters', items: [
        'Every one of these issues blocks repeat-order automation or corrupts OTIF analytics.',
        'None of them need a WMS to fix — they need matching, normalization, and lineage.' ] } ] },
  mapping: { title: 'Canonical Outlet-SKU-Route Model', summary: 'This page shows how fields from nine sources map into one shared model that makes outlets, SKUs, routes, and quantities comparable.',
    sections: [
      { title: 'What you can do here', items: [
        'Expand each canonical field to see which source columns feed it and the mapping logic.',
        'Click Auto-Map to generate AI-suggested mappings with confidence scores.',
        'Approve, reject, or skip each mapping — low-confidence ones deserve human eyes.' ] },
      { title: 'What to look for', items: [
        'Delivery windows (78%) and sales rep ownership (74%) score lowest — they need inference.',
        'Quantity normalization (96%) is nearly automatic thanks to unit_per_case rules.' ] } ] },
  workbench: { title: 'Self-Healing Workbench', summary: 'The engine proposes outlet merges, SKU merges, normalizations, conversions, and inferences. You approve or reject each one.',
    sections: [
      { title: 'What you can do here', items: [
        'Review the merge clusters at the top — outlets and SKUs about to collapse into golden records.',
        'Work the exception queue by category: Normalize, Match, Enrich, Validate.',
        'Accept individual solutions, or Re-run with Rules to auto-accept everything above 90%.' ] },
      { title: 'What to look for', items: [
        'The Maverik rep inference (88%) stays at Sales review — inference is never silently trusted.',
        'The negative inventory validation shows how a SKU merge fixes an "impossible" stock position.' ] } ] },
  golden: { title: 'Golden Outlet-SKU Records', summary: 'One trusted row per outlet and SKU combination, with the repeat-order metrics and a recommended action for each.',
    sections: [
      { title: 'What you can do here', items: [
        'Search and browse the golden repeat-order records.',
        'Click any row to trace its lineage back to the ERP, CRM, TMS, inventory, and POD rows that built it.',
        'Check the action column: Auto-prefill, Sales review, Do not suggest, or Data fix needed.' ] },
      { title: 'What to look for', items: [
        'Walmart × Dasani: 96% confidence, auto-prefill — the payoff of the outlet merge.',
        'Sprite at 7-Eleven: suppressed because promos and low stock make the pattern unstable.',
        'Top Stop × Powerade: "Data fix needed" — the honest answer when both systems lack a window.' ] } ] },
  search: { title: 'Repeat-Order Impact', summary: 'Compare the raw fragmented view with the golden view for any outlet or SKU, and see the portfolio-level business impact.',
    sections: [
      { title: 'What you can do here', items: [
        'Search "walmart", "maverik", "coke zero", "sprite", or "dasani" to see before/after for each hero example.',
        'Read the impact tiles: duplicate reduction, matched orders, repeat-order coverage, and the action split.',
        'Push the golden dataset to the rep ordering app with the button at the top.' ] },
      { title: 'What to look for', items: [
        'Raw search returns duplicate customers and orphan orders; golden search returns one outlet with a recommendation.',
        '42% auto-prefill / 31% review / 27% suppressed — reps keep control while losing the re-keying work.' ] } ] },
};

function getSwireSampleRowCount() { return Object.values(SWIRE_FILES).reduce((sum, file) => sum + file.data.length, 0); }
function getSwireIssueCount() { return Object.values(SWIRE_FILES).reduce((sum, file) => sum + (file.issues || []).length, 0); }
function getSwireCriticalCount() { return Object.values(SWIRE_FILES).reduce((sum, file) => sum + (file.issues || []).filter(i => i.severity === 'high').length, 0); }
function getSwireGoldenRecordCount() { return SWIRE_GOLDEN_RECORDS.length; }
