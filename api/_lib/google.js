import { decryptSecret, encryptSecret } from './crypto.js';
import { getSql } from './db.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const SCOPE_MODE_MAP = {
  app_created: [
    'openid',
    'email',
    'https://www.googleapis.com/auth/calendar.app.created',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  ],
  read_only: [
    'openid',
    'email',
    'https://www.googleapis.com/auth/calendar.app.created',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  all_events: [
    'openid',
    'email',
    'https://www.googleapis.com/auth/calendar.app.created',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
};

export function getScopesForMode(scopeMode = 'app_created') {
  return SCOPE_MODE_MAP[scopeMode] || SCOPE_MODE_MAP.app_created;
}

export function buildGoogleConsentUrl({ clientId, redirectUri, state, scopeMode }) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'false');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('scope', getScopesForMode(scopeMode).join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeCodeForTokens({ code, redirectUri }) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange code for tokens');
  }

  return data;
}

export async function refreshGoogleAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh access token');
  }

  return data;
}

export async function revokeGoogleToken(token) {
  const response = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      token,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Failed to revoke Google token');
  }

  return true;
}

export function parseIdToken(idToken) {
  const parts = idToken.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid id_token');
  }

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  return {
    googleUserId: payload.sub,
    email: payload.email || null,
  };
}

export async function upsertGoogleConnection({
  googleUserId,
  email,
  name,
  picture,
  scopeMode,
  refreshToken,
  accessToken,
  accessTokenExpiresIn,
}) {
  const sql = getSql();
  const encryptedRefreshToken = refreshToken ? encryptSecret(refreshToken) : null;
  const expiresAt = accessTokenExpiresIn
    ? new Date(Date.now() + accessTokenExpiresIn * 1000).toISOString()
    : null;

  const rows = await sql`
    INSERT INTO google_connections (
      google_user_id,
      email,
      display_name,
      picture_url,
      scope_mode,
      encrypted_refresh_token,
      access_token,
      access_token_expires_at
    )
    VALUES (
      ${googleUserId},
      ${email},
      ${name},
      ${picture},
      ${scopeMode},
      ${encryptedRefreshToken},
      ${accessToken},
      ${expiresAt}
    )
    ON CONFLICT (google_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      picture_url = EXCLUDED.picture_url,
      scope_mode = EXCLUDED.scope_mode,
      encrypted_refresh_token = COALESCE(EXCLUDED.encrypted_refresh_token, google_connections.encrypted_refresh_token),
      access_token = EXCLUDED.access_token,
      access_token_expires_at = EXCLUDED.access_token_expires_at,
      updated_at = NOW()
    RETURNING id, google_user_id, email, display_name, picture_url, scope_mode
  `;

  return rows[0];
}

export async function getConnectionById(connectionId) {
  const sql = getSql();
  const rows = await sql`
    SELECT
      id,
      google_user_id,
      email,
      display_name,
      picture_url,
      scope_mode,
      encrypted_refresh_token,
      access_token,
      access_token_expires_at
    FROM google_connections
    WHERE id = ${connectionId}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function clearGoogleConnectionAuth(connectionId) {
  const sql = getSql();
  await sql`
    UPDATE google_connections
    SET
      encrypted_refresh_token = NULL,
      access_token = NULL,
      access_token_expires_at = NULL,
      updated_at = NOW()
    WHERE id = ${connectionId}
  `;
}

export async function deleteGoogleConnection(connectionId) {
  const sql = getSql();
  await sql`
    DELETE FROM google_connections
    WHERE id = ${connectionId}
  `;
}

export async function getValidGoogleAccessToken(connectionId) {
  const connection = await getConnectionById(connectionId);
  if (!connection) {
    throw new Error('Google connection not found');
  }

  const expiresAt = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : 0;
  const stillValid = connection.access_token && expiresAt > Date.now() + 60_000;

  if (stillValid) {
    return connection.access_token;
  }

  if (!connection.encrypted_refresh_token) {
    throw new Error('Missing refresh token');
  }

  const refreshed = await refreshGoogleAccessToken(
    decryptSecret(connection.encrypted_refresh_token),
  );

  const nextExpiresAt = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    : null;
  const sql = getSql();
  await sql`
    UPDATE google_connections
    SET
      access_token = ${refreshed.access_token},
      access_token_expires_at = ${nextExpiresAt},
      updated_at = NOW()
    WHERE id = ${connectionId}
  `;

  return refreshed.access_token;
}
