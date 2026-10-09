-- rule: T-ASSET-LOC | evidence timeline per asset: install-base observation, movements, service visits.
-- the latest event is evidence, not truth; conflicts are resolved in review.
SELECT e."Electronic_Asset_ID" AS asset_id, 'install_base' AS event_type, e."_rid" AS source_row_id,
       TRY_CAST(e."Equipment_Confirmation_Date" AS DATE) AS event_date,
       e."Site_Name" AS location_text, 'Install base confirmation' AS evidence_source
FROM equipment e
UNION ALL
SELECT r.asset_id, 'movement_' || lower(replace(m."Movement_Type", ' ', '_')), m."_rid",
       TRY_CAST(m."Movement_Date" AS DATE), m."Destination_Location", m."Event_Source"
FROM movements m
JOIN q_asset_resolution r ON r.source = '07' AND r.source_row_id = m."_rid" AND r.candidate_assets = 1
UNION ALL
SELECT r.asset_id, 'service_visit', s."_rid",
       TRY_CAST(s."Visit_Date" AS DATE), s."Customer_Site_Entered", 'Field service ' || s."Service_Type"
FROM service s
JOIN q_asset_resolution r ON r.source = '08' AND r.source_row_id = s."_rid" AND r.candidate_assets = 1
ORDER BY asset_id, event_date, event_type;
