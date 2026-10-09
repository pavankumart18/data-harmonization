-- rule: J-CTR-ACC | native exact join, contract -> Salesforce account. Missing account stays unresolved.
SELECT
  c."_rid" AS contract_rid,
  c."Contract_ID",
  c."Salesforce_Account_ID",
  a."Account_Name",
  c."Pricing_Schedule_by_Transaction_Type",
  CASE WHEN c."Pricing_Schedule_by_Transaction_Type" ILIKE 'Infusion%'   THEN 'MMS-INF-01'
       WHEN c."Pricing_Schedule_by_Transaction_Type" ILIKE 'Dispensing%' THEN 'MMS-DISP-01' END AS covered_material,
  c."Contract_Status",
  TRY_CAST(c."Term_Begin_Date" AS DATE) AS term_begin,
  TRY_CAST(c."Term_End_Date" AS DATE)   AS term_end,
  c."PO_Required",
  CASE WHEN c."Salesforce_Account_ID" IS NULL THEN 'unresolved_missing_key'
       WHEN a."Salesforce_Account_ID" IS NULL THEN 'unresolved_not_in_extract'
       ELSE 'native_match' END AS join_status
FROM sf_contracts c
LEFT JOIN sf_accounts a ON c."Salesforce_Account_ID" = a."Salesforce_Account_ID"
ORDER BY c."Contract_ID";
