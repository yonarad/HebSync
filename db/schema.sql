CREATE TABLE IF NOT EXISTS google_connections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  google_user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT,
  picture_url TEXT,
  scope_mode TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_hash TEXT NOT NULL UNIQUE,
  google_connection_id BIGINT NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
  ON user_sessions (expires_at);
