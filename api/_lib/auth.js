import { parseCookies } from './cookies.js';
import { signToken } from './crypto.js';
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

export function getSessionTokenFromRequest(request) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  return cookies[getSessionCookieName()] || null;
}

export function createCsrfToken(sessionToken) {
  return signToken(sessionToken, 'csrf');
}

export function verifyCsrf(request, sessionToken) {
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfHeader || !sessionToken) {
    return false;
  }

  return csrfHeader === createCsrfToken(sessionToken);
}
