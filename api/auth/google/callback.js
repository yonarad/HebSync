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

function buildAuthErrorRedirect(request, authError, authErrorDetail) {
  const url = new URL('/', request.url);
  url.searchParams.set('authError', authError);
  if (authErrorDetail) {
    url.searchParams.set('authErrorDetail', authErrorDetail);
  }
  return redirect(url.toString());
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.warn('OAuth callback returned provider error', {
        error,
        returnedStatePresent: Boolean(returnedState),
      });
      return buildAuthErrorRedirect(request, 'google_oauth_error', error);
    }

    const cookies = parseCookies(request.headers.get('cookie') || '');
    const stateCookieName = getOAuthStateCookieName();
    const statePayload = cookies[stateCookieName] ? JSON.parse(cookies[stateCookieName]) : null;

    if (!code || !returnedState || !statePayload || statePayload.state !== returnedState) {
      console.warn('OAuth callback rejected invalid state', {
        hasCode: Boolean(code),
        returnedStatePresent: Boolean(returnedState),
        stateCookiePresent: Boolean(cookies[stateCookieName]),
        statePayloadPresent: Boolean(statePayload),
        stateMatches: Boolean(statePayload?.state && statePayload.state === returnedState),
      });
      return buildAuthErrorRedirect(request, 'invalid_auth_state');
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
      name: null,
      picture: null,
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
    console.error('OAuth callback failed', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || null,
    });
    return buildAuthErrorRedirect(request, 'authentication_failed');
  }
}
