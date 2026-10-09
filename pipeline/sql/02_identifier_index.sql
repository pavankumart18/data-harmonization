-- rule: N-SERIAL-01 | staged asset identifier index (never OR-join nullable serials)
-- one row per (source, source_row_id, id_type) with a non-blank value.
-- serial normalization: upper-case, trim, letter O -> digit 0 after the product prefix.
WITH ids AS (
  SELECT '06' AS source, "_rid" AS source_row_id, 'electronic_asset_id' AS id_type, "Electronic_Asset_ID" AS raw_value FROM equipment
  UNION ALL SELECT '06', "_rid", 'serial_number',       "Serial_Number"            FROM equipment
  UNION ALL SELECT '06', "_rid", 'alternate_asset_id',  "Alternate_Asset_ID"       FROM equipment
  UNION ALL SELECT '06', "_rid", 'udi',                 "Unique_Device_Identifier" FROM equipment
  UNION ALL SELECT '07', "_rid", 'electronic_asset_id', "Asset_Tag"                FROM movements
  UNION ALL SELECT '07', "_rid", 'serial_number',       "Scanned_Serial"           FROM movements
  UNION ALL SELECT '08', "_rid", 'electronic_asset_id', "Equipment_Tag"            FROM service
  UNION ALL SELECT '08', "_rid", 'serial_number',       "Observed_Serial"          FROM service
  UNION ALL SELECT '09', "_rid", 'serial_number',       "Equipment_Serial"         FROM orders
)
SELECT
  source,
  source_row_id,
  id_type,
  raw_value,
  CASE WHEN id_type = 'serial_number'
       THEN split_part(upper(trim(raw_value)), '-', 1) || '-' ||
            replace(substr(upper(trim(raw_value)), strpos(upper(trim(raw_value)), '-') + 1), 'O', '0')
       ELSE upper(trim(raw_value)) END AS normalized_value
FROM ids
WHERE raw_value IS NOT NULL AND trim(raw_value) <> ''
ORDER BY source, source_row_id, id_type;
