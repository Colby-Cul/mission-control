-- user_tokens: stores per-user OAuth tokens for third-party providers.
-- Primary use: Google Workspace (Calendar + Gmail) for the Upcoming Events widget.
-- One row per (user_id, provider). Upserted on /api/auth/google/callback.
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id       uuid        NOT NULL,
  provider      text        NOT NULL,
  access_token  text        NOT NULL,
  refresh_token text,
  expires_at    timestamptz,
  scope         text[],
  updated_at    timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user ON user_tokens (user_id);

-- RLS: users can only read their own tokens. Writes happen via service-role key
-- from the OAuth callback route, which bypasses RLS entirely.
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tokens_self_select" ON user_tokens;
CREATE POLICY "user_tokens_self_select"
  ON user_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_tokens_self_delete" ON user_tokens;
CREATE POLICY "user_tokens_self_delete"
  ON user_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE policies — only service-role (used by the callback route) can write.
