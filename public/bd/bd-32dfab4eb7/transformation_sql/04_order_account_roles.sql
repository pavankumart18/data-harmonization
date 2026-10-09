-- rule: J-ORD-ROLE | account roles are relationships: each order role must point at an
-- ERP account that carries that role (sold-to, ship-to, bill-to, payer).
WITH roles AS (
  SELECT "_rid" AS order_rid, "SAP_Sales_Order", "SAP_Client", 'SOLD_TO' AS role, "Sold_To_No" AS account_no FROM orders
  UNION ALL SELECT "_rid", "SAP_Sales_Order", "SAP_Client", 'SHIP_TO', "Ship_To_No" FROM orders
  UNION ALL SELECT "_rid", "SAP_Sales_Order", "SAP_Client", 'BILL_TO', "Bill_To_No" FROM orders
  UNION ALL SELECT "_rid", "SAP_Sales_Order", "SAP_Client", 'PAYER',   "Payer_No"   FROM orders
),
acct AS (
  SELECT "ERP_Customer_ID", min("ERP_System") AS "ERP_System", string_agg("Account_Role", '|' ORDER BY "Account_Role") AS roles
  FROM sap_accounts GROUP BY "ERP_Customer_ID"
)
SELECT
  r.order_rid, r."SAP_Sales_Order", r.role, r.account_no, r."SAP_Client",
  a."ERP_System"                                  AS account_system,
  a."ERP_Customer_ID" IS NOT NULL                 AS account_found,
  coalesce(strpos(a.roles, r.role) > 0, false)    AS role_matches,
  coalesce(a."ERP_System" = r."SAP_Client", false) AS system_matches
FROM roles r
LEFT JOIN acct a ON r.account_no = a."ERP_Customer_ID"
ORDER BY r."SAP_Sales_Order", r.role;
