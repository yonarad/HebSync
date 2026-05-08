import { createOpaqueToken, hashToken } from './crypto.js';
import { getSql } from './db.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function getSessionMaxAgeSeconds() {
  return SESSION_TTL_SECONDS;
}

export async function createSession(googleConnectionId) {
  const sql = getSql();
  const token = createOpaqueToken(32);
  const sessionHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  await sql`
    INSERT INTO user_sessions (session_hash, google_connection_id, expires_at)
    VALUES (${sessionHash}, ${googleConnectionId}, ${expiresAt})
  `;

  return {
    token,
    expiresAt,
  };
}

export async function getSessionByToken(token) {
  const sql = getSql();
  const sessionHash = hashToken(token);
  const rows = await sql`
    SELECT
      s.id,
      s.google_connection_id,
      s.expires_at,
      c.scope_mode
    FROM user_sessions s
    JOIN google_connections c ON c.id = s.google_connection_id
    WHERE s.session_hash = ${sessionHash}
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function deleteSessionByToken(token) {
  const sql = getSql();
  const sessionHash = hashToken(token);
  await sql`DELETE FROM user_sessions WHERE session_hash = ${sessionHash}`;
}

export async function deleteSessionsByConnectionId(connectionId) {
  const sql = getSql();
  await sql`DELETE FROM user_sessions WHERE google_connection_id = ${connectionId}`;
}
