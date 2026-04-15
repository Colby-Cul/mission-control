-- Mission Control v7 — add canonical Lodgify identifiers to property_assets.
-- The pre-existing `lodgify_id text` column is kept for backward-compat,
-- but the adapter + UI prefer `lodgify_property_id bigint`.
-- Applied via Supabase MCP on 2026-04-15; this file mirrors the migration for repo history.

ALTER TABLE property_assets ADD COLUMN IF NOT EXISTS lodgify_property_id bigint;
ALTER TABLE property_assets ADD COLUMN IF NOT EXISTS lodgify_internal_name text;
CREATE INDEX IF NOT EXISTS property_assets_lodgify_idx ON property_assets(lodgify_property_id);

-- Property → Lodgify mapping (from docs/lodgify-inventory.md Phase 2 table)
UPDATE property_assets
SET lodgify_property_id = 533203,
    lodgify_internal_name = '47 Shasta Trail, Graeagle CA'
WHERE id = '60cbcc48-dde9-4bc1-bd12-144ec52bbb66';

UPDATE property_assets
SET lodgify_property_id = 746614,
    lodgify_internal_name = 'Luxury Northstar Getaway • On Golf Course'
WHERE id = 'c38a62e3-d856-442a-b602-ceb97ba915ad';

-- 7246 Orchard Cir, Penryn (primary residence) remains unmatched — expected.
