import { parseCookies } from '../_lib/cookies.js';
import { getSessionCookieName } from '../_lib/env.js';
import { json } from '../_lib/response.js';
import { getSessionByToken } from '../_lib/sessions.js';

export async function GET(request) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const sessionToken = cookies[getSessionCookieName()];

  if (!sessionToken) {
    return json({ authenticated: false }, { status: 401 });
  }

  const session = await getSessionByToken(sessionToken);
  if (!session) {
    return json({ authenticated: false }, { status: 401 });
  }

  return json({
    authenticated: true,
    user: {
      googleUserId: session.google_user_id,
      email: session.email,
      name: session.display_name,
      picture: session.picture_url,
      scopeMode: session.scope_mode,
    },
  });
}
