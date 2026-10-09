-- rule: B-ENTITLE-01 / B-PO-01 | order -> golden facility (via sold-to crosswalk) -> contract covering the
-- ordered material. Uses the facility crosswalk produced by the matching stage (xwalk), so only
-- crosswalk rows at or above the publish threshold are used.
WITH ord AS (
  SELECT o."_rid" AS order_rid, o."SAP_Sales_Order", o."Material_Number", o."Customer_PO_Number",
         TRY_CAST(o."Order_Created_On" AS DATE) AS order_date, x.golden_facility_id
  FROM orders o
  LEFT JOIN xwalk x ON x.source_table = 'sap_accounts' AND x.native_id = o."Sold_To_No"
),
ctr AS (
  SELECT c."Contract_ID", c."Contract_Status", c."PO_Required",
         TRY_CAST(c."Term_Begin_Date" AS DATE) AS term_begin, TRY_CAST(c."Term_End_Date" AS DATE) AS term_end,
         CASE WHEN c."Pricing_Schedule_by_Transaction_Type" ILIKE 'Infusion%' THEN 'MMS-INF-01' ELSE 'MMS-DISP-01' END AS covered_material,
         x.golden_facility_id
  FROM sf_contracts c
  JOIN xwalk x ON x.source_table = 'sf_accounts' AND x.native_id = c."Salesforce_Account_ID"
)
SELECT
  ord.order_rid, ord."SAP_Sales_Order", ord.golden_facility_id, ord."Material_Number", ord.order_date,
  ctr."Contract_ID", ctr."Contract_Status", ctr.term_begin, ctr.term_end, ctr."PO_Required",
  ord."Customer_PO_Number" IS NULL AS po_missing,
  CASE WHEN ctr."Contract_ID" IS NULL THEN 'no_linked_contract'
       WHEN ctr."Contract_Status" <> 'Active' THEN 'contract_not_active'
       WHEN ctr.term_end IS NULL THEN 'term_end_missing'
       WHEN ord.order_date NOT BETWEEN ctr.term_begin AND ctr.term_end THEN 'outside_term'
       ELSE 'covered' END AS entitlement_status
FROM ord
LEFT JOIN ctr ON ctr.golden_facility_id = ord.golden_facility_id AND ctr.covered_material = ord."Material_Number"
ORDER BY ord."SAP_Sales_Order";
