import { parseCookies } from './cookies.js';
import { getSessionCookieName } from './env.js';
import { getSessionByToken } from './sessions.js';

export async function requireSession(request) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const sessionToken = cookies[getSessionCookieName()];

  if (!sessionToken) {
    return null;
  }

  return getSessionByToken(sessionToken);
}
