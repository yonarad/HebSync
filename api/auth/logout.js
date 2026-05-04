import { parseCookies, serializeCookie } from '../_lib/cookies.js';
import { getCookieOptions, getLogoutRedirectPath, getSessionCookieName } from '../_lib/env.js';
import { redirect } from '../_lib/response.js';
import { deleteSessionByToken } from '../_lib/sessions.js';

export async function GET(request) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const sessionCookieName = getSessionCookieName();
  const sessionToken = cookies[sessionCookieName];

  if (sessionToken) {
    await deleteSessionByToken(sessionToken);
  }

  return redirect(getLogoutRedirectPath(), {
    headers: {
      'Set-Cookie': serializeCookie(sessionCookieName, '', getCookieOptions({ maxAge: 0 })),
    },
  });
}
