-- rule: B-PAYER-01 | compare invoice payer with the order payer, then resolve to an ERP payer account
SELECT
  q.invoice_rid,
  q."SAP_Billing_Document",
  q."Reference_Sales_Order",
  q.invoice_payer,
  q.order_payer,
  CASE
    WHEN q.invoice_payer IS NULL AND q.order_payer IS NULL THEN 'both_missing'
    WHEN q.invoice_payer IS NULL THEN 'invoice_missing'
    WHEN q.order_payer IS NULL THEN 'order_missing'
    WHEN q.invoice_payer = q.order_payer THEN 'consistent'
    ELSE 'conflict'
  END AS payer_status,
  coalesce(q.invoice_payer, q.order_payer) AS resolved_payer,
  p."Payment_Block"                        AS payer_payment_block,
  q.open_amount_usd
FROM q_invoice_order_join q
LEFT JOIN (SELECT DISTINCT "ERP_Customer_ID", "Payment_Block" FROM sap_accounts) p
  ON coalesce(q.invoice_payer, q.order_payer) = p."ERP_Customer_ID"
ORDER BY q."SAP_Billing_Document";
