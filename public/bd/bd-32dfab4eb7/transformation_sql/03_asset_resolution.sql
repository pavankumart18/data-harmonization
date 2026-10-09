-- rule: J-ASSET-ID | resolve movement / service / order identifiers to one installed asset
-- strong IDs only (asset tag, serial). >1 candidate asset = conflict, 0 = unresolved.
WITH eq AS (
  SELECT i.id_type, i.normalized_value, i.raw_value AS asset_raw, e."Electronic_Asset_ID" AS asset_id
  FROM identifier_index i
  JOIN equipment e ON i.source_row_id = e."_rid"
  WHERE i.source = '06' AND i.id_type IN ('electronic_asset_id', 'serial_number')
),
refs AS (
  SELECT * FROM identifier_index WHERE source <> '06'
),
m AS (
  SELECT r.source, r.source_row_id, r.id_type, r.raw_value, eq.asset_id,
         (upper(trim(r.raw_value)) = upper(trim(eq.asset_raw))) AS raw_exact
  FROM refs r
  LEFT JOIN eq ON r.id_type = eq.id_type AND r.normalized_value = eq.normalized_value
)
SELECT
  source,
  source_row_id,
  count(DISTINCT asset_id)                                              AS candidate_assets,
  min(asset_id)                                                         AS asset_id,
  coalesce(bool_or(raw_exact), false)                                   AS matched_without_normalization,
  string_agg(DISTINCT CASE WHEN asset_id IS NOT NULL THEN id_type END, '+' ORDER BY CASE WHEN asset_id IS NOT NULL THEN id_type END) AS matched_on
FROM m
GROUP BY source, source_row_id
ORDER BY source, source_row_id;
