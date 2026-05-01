-- Add missing agent card columns: xp, tasks_done, study
-- These drive the Agent Detail Cards stats display

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS xp           integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_done   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS study        integer NOT NULL DEFAULT 0;

-- Seed reasonable baseline XP from knowledge_level
UPDATE agents SET xp = CASE
  WHEN knowledge_level = 'expert'     THEN 1200
  WHEN knowledge_level = 'specialist' THEN 600
  ELSE 0
END
WHERE xp = 0;

COMMENT ON COLUMN agents.xp         IS 'Cumulative experience points earned via completed runs and achievements';
COMMENT ON COLUMN agents.tasks_done IS 'Total completed tasks across all time';
COMMENT ON COLUMN agents.study      IS 'Keep-learning sessions completed (vault writes)';
