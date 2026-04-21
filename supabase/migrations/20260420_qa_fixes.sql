-- QA Fix 1: Add capabilities column to agent_knowledge
ALTER TABLE agent_knowledge
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '[]';

-- Populate capabilities from agents table (agents.capabilities is text[])
UPDATE agent_knowledge ak
SET capabilities = to_jsonb(a.capabilities)
FROM agents a
WHERE ak.agent_id = a.id
  AND a.capabilities IS NOT NULL
  AND array_length(a.capabilities, 1) > 0;

-- QA Fix 2: Add missing visions (4 sample visions)
-- Note: progress_pct is a GENERATED column (ALWAYS) — omit from INSERT
INSERT INTO visions (name, title, category, status, target_low, target_high, current_saved, priority, note)
VALUES
  (
    'Travel: 10 Countries by 2030',
    'Travel: 10 Countries by 2030',
    'Travel',
    'active',
    NULL,
    NULL,
    0,
    5,
    'Visit 10 countries by 2030. Currently at 2/10.'
  ),
  (
    'Family Legacy Estate',
    'Family Legacy Estate',
    'Family',
    'planning',
    5000000,
    10000000,
    0,
    8,
    'Build a family legacy estate. Target: $5M–$10M.'
  ),
  (
    'Peak Health & Longevity',
    'Peak Health & Longevity',
    'Health',
    'active',
    NULL,
    NULL,
    0,
    7,
    'Achieve peak health and longevity through optimized lifestyle.'
  ),
  (
    'Build a $100M Real Estate Portfolio',
    'Build a $100M Real Estate Portfolio',
    'Business',
    'planning',
    NULL,
    100000000,
    0,
    9,
    'Scale real estate holdings to $100M portfolio value.'
  )
ON CONFLICT DO NOTHING;
