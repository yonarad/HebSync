import { getSessionTokenFromRequest, requireSession, verifyCsrf } from '../_lib/auth.js';
import { decryptSecret } from '../_lib/crypto.js';
import { serializeCookie } from '../_lib/cookies.js';
import { getCookieOptions, getSessionCookieName } from '../_lib/env.js';
import { deleteGoogleConnection, getConnectionById, revokeGoogleToken } from '../_lib/google.js';
import { json } from '../_lib/response.js';
import { deleteSessionByToken, deleteSessionsByConnectionId } from '../_lib/sessions.js';

export async function DELETE(request) {
  const sessionCookieName = getSessionCookieName();
  const sessionToken = getSessionTokenFromRequest(request);
  const session = sessionToken ? await requireSession(request) : null;

  if (!sessionToken || !session) {
    return json(
      { success: true },
      {
        headers: {
          'Set-Cookie': serializeCookie(sessionCookieName, '', getCookieOptions({ maxAge: 0 })),
        },
      },
    );
  }

  if (!verifyCsrf(request, sessionToken)) {
    return json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  try {
    const connection = await getConnectionById(session.google_connection_id);

    if (connection?.encrypted_refresh_token) {
      await revokeGoogleToken(decryptSecret(connection.encrypted_refresh_token));
    } else if (connection?.access_token) {
      await revokeGoogleToken(connection.access_token);
    }
  } catch (error) {
    console.error('Failed to revoke Google grant during account deletion:', error);
  } finally {
    await deleteSessionsByConnectionId(session.google_connection_id);
    await deleteSessionByToken(sessionToken);
    await deleteGoogleConnection(session.google_connection_id);
  }

  return json(
    { success: true },
    {
      headers: {
        'Set-Cookie': serializeCookie(sessionCookieName, '', getCookieOptions({ maxAge: 0 })),
      },
    },
  );
}
