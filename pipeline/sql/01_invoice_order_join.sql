-- rule: J-INV-ORD | native transactional join, invoice -> sales order
-- inputs: billing, orders | grain: one row per invoice
SELECT
  b."_rid"                                   AS invoice_rid,
  b."SAP_Billing_Document",
  b."Reference_Sales_Order",
  o."_rid"                                   AS order_rid,
  o."Sold_To_No",
  o."Payer_No"                               AS order_payer,
  b."Payer_Account_No"                       AS invoice_payer,
  TRY_CAST(b."Billing_Amount_USD" AS DOUBLE) AS billing_amount_usd,
  TRY_CAST(b."Open_Amount_USD" AS DOUBLE)    AS open_amount_usd,
  b."Clearing_Status",
  o."SAP_Sales_Order" IS NOT NULL            AS order_found
FROM billing b
LEFT JOIN orders o
  ON b."Reference_Sales_Order" = o."SAP_Sales_Order"
ORDER BY b."SAP_Billing_Document";
