-- ───────────────────────────────────────────────────────────────────
-- Seed the "Culbertson & Gray Group" entity for the Follow Up Boss
-- (FUB) integration.  Idempotent — safe to re-run.  Ownership edges
-- are intentionally left unset; user will wire them via the UI.
--
-- Account: The Culbertson and Gray Group
--   · FUB domain:    culbertsonandgray
--   · FUB account id: 1644863160
--   · Owner:         Colby Culbertson (Broker + Admin + Owner)
--
-- Related adapter: /tmp/mc-merge-v7/app/lib/fub.ts
-- Related page:    /companies/culbertson-gray
-- ───────────────────────────────────────────────────────────────────
INSERT INTO entity_ownership (
  id, entity_id, entity_name, slug, entity_type, tax_classification,
  purpose, formation_state, is_active, state
)
VALUES (
  'culbertson-gray',
  'culbertson-gray',
  'The Culbertson and Gray Group',
  'culbertson-gray',
  'LLC',
  'disregarded',
  'operating',
  'CA',
  true,
  'CA'
)
ON CONFLICT (id) DO NOTHING;
