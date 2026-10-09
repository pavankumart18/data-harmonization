-- rule: J-CON-ACC | native exact join, contact -> Salesforce account
SELECT
  c."_rid" AS contact_rid,
  c."Universal_Contact_ID",
  c."BD_Contact_Type",
  c."Salesforce_Account_ID",
  a."Account_Name",
  CASE WHEN c."Salesforce_Account_ID" IS NULL THEN 'unresolved_missing_key'
       WHEN a."Salesforce_Account_ID" IS NULL THEN 'unresolved_not_in_extract'
       ELSE 'native_match' END AS join_status
FROM sf_contacts c
LEFT JOIN sf_accounts a ON c."Salesforce_Account_ID" = a."Salesforce_Account_ID"
ORDER BY c."Universal_Contact_ID";
