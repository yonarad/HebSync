import { parseCookies, serializeCookie } from '../../_lib/cookies.js';
import { createSession, getSessionMaxAgeSeconds } from '../../_lib/sessions.js';
import {
  getCookieOptions,
  getOAuthStateCookieName,
  getPostAuthRedirectPath,
  getSessionCookieName,
  getGoogleRedirectUri,
} from '../../_lib/env.js';
import { exchangeCodeForTokens, parseIdToken, upsertGoogleConnection } from '../../_lib/google.js';
import { redirect } from '../../_lib/response.js';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return redirect(`${getPostAuthRedirectPath()}?authError=${encodeURIComponent(error)}`);
    }

    const cookies = parseCookies(request.headers.get('cookie') || '');
    const stateCookieName = getOAuthStateCookieName();
    const statePayload = cookies[stateCookieName] ? JSON.parse(cookies[stateCookieName]) : null;

    if (!code || !returnedState || !statePayload || statePayload.state !== returnedState) {
      return new Response('Invalid OAuth state', { status: 400 });
    }

    const tokens = await exchangeCodeForTokens({
      code,
      redirectUri: getGoogleRedirectUri(request),
    });

    if (!tokens.id_token) {
      throw new Error('Google did not return id_token');
    }

    const identity = parseIdToken(tokens.id_token);
    const connection = await upsertGoogleConnection({
      googleUserId: identity.googleUserId,
      email: identity.email,
      name: identity.name,
      picture: identity.picture,
      scopeMode: statePayload.scopeMode || 'app_created',
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      accessTokenExpiresIn: tokens.expires_in,
    });

    const session = await createSession(connection.id);
    const clearStateCookie = serializeCookie(stateCookieName, '', getCookieOptions({ maxAge: 0 }));
    const sessionCookie = serializeCookie(
      getSessionCookieName(),
      session.token,
      getCookieOptions({
        maxAge: getSessionMaxAgeSeconds(),
      }),
    );

    const headers = new Headers();
    headers.append('Set-Cookie', clearStateCookie);
    headers.append('Set-Cookie', sessionCookie);

    return redirect(statePayload.returnTo || getPostAuthRedirectPath(), {
      headers,
    });
  } catch (error) {
    console.error('OAuth callback failed:', error);
    return new Response('Authentication failed', { status: 500 });
  }
}
