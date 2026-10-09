-- rule: AR-AGE-01 | invoice-level open receivables with aged buckets as of the run date.
-- one row per invoice; amounts are never summed across exception rows.
SELECT
  b."_rid" AS invoice_rid,
  b."SAP_Billing_Document",
  b."Reference_Sales_Order",
  TRY_CAST(b."Open_Amount_USD" AS DOUBLE) AS open_amount_usd,
  TRY_CAST(b."Net_Due_Date" AS DATE)      AS net_due_date,
  date_diff('day', TRY_CAST(b."Net_Due_Date" AS DATE), getvariable('as_of')) AS days_past_due,
  CASE
    WHEN date_diff('day', TRY_CAST(b."Net_Due_Date" AS DATE), getvariable('as_of')) <= 0  THEN 'Current'
    WHEN date_diff('day', TRY_CAST(b."Net_Due_Date" AS DATE), getvariable('as_of')) <= 30 THEN '1-30'
    WHEN date_diff('day', TRY_CAST(b."Net_Due_Date" AS DATE), getvariable('as_of')) <= 60 THEN '31-60'
    WHEN date_diff('day', TRY_CAST(b."Net_Due_Date" AS DATE), getvariable('as_of')) <= 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket,
  b."Collection_Note"
FROM billing b
WHERE TRY_CAST(b."Open_Amount_USD" AS DOUBLE) > 0
ORDER BY b."SAP_Billing_Document";
