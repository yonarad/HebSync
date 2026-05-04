import { serializeCookie } from '../../_lib/cookies.js';
import { createOpaqueToken } from '../../_lib/crypto.js';
import { getCookieOptions, getOAuthStateCookieName, getGoogleRedirectUri, normalizeReturnTo } from '../../_lib/env.js';
import { buildGoogleConsentUrl } from '../../_lib/google.js';
import { redirect } from '../../_lib/response.js';

export async function GET(request) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return new Response('Missing GOOGLE_CLIENT_ID', { status: 500 });
  }

  const url = new URL(request.url);
  const scopeMode = url.searchParams.get('scopeMode') || 'app_created';
  const state = createOpaqueToken(24);
  const redirectUri = getGoogleRedirectUri(request);
  const googleUrl = buildGoogleConsentUrl({
    clientId: process.env.GOOGLE_CLIENT_ID,
    redirectUri,
    state,
    scopeMode,
  });

  const stateCookie = serializeCookie(
    getOAuthStateCookieName(),
    JSON.stringify({
      state,
      scopeMode,
      returnTo: normalizeReturnTo(request, url.searchParams.get('returnTo')),
    }),
    getCookieOptions({
      maxAge: 60 * 10,
    }),
  );

  return redirect(googleUrl, {
    headers: {
      'Set-Cookie': stateCookie,
    },
  });
}
