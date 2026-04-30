-- ───────────────────────────────────────────────────────────────────
-- Entity metadata — DBA (Doing Business As) + legal name merge
--
-- Adds an optional dba column to entity_ownership so pages can show:
--   - large title  = display_name  (fallback: entity_name)
--   - subtitle     = entity_name · entity_type · formation_state · DBA: dba
--
-- Culbertson entity merge:
--   legal_name = "Culbertson and Culbertson"  (S-Corp)
--   dba        = "The Culbertson and Gray Group, Inc"
--   display    = "The Culbertson and Gray Group"
--
-- Idempotent. Safe to re-run.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE entity_ownership ADD COLUMN IF NOT EXISTS dba text;

-- Ensure display_name exists (created by the earlier migration but guarded here)
ALTER TABLE entity_ownership ADD COLUMN IF NOT EXISTS display_name text;

-- Merge C&C / C&G into one entity row.
-- They are the same legal entity; rename entity_name to legal name and
-- populate dba + display_name accordingly.
UPDATE entity_ownership
SET entity_name  = 'Culbertson and Culbertson',
    display_name = 'The Culbertson and Gray Group',
    dba          = 'The Culbertson and Gray Group, Inc',
    entity_type  = 'S-Corp',
    formation_state = COALESCE(formation_state, 'CA'),
    state        = COALESCE(state, 'CA')
WHERE id = 'culbertson-gray' OR slug = 'culbertson-gray';
