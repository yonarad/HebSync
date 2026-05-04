const SESSION_COOKIE_NAME = 'hebsync_session';
const OAUTH_STATE_COOKIE_NAME = 'hebsync_oauth_state';

export function getAppBaseUrl(request) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '');
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function getGoogleRedirectUri(request) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }

  return `${getAppBaseUrl(request)}/api/auth/google/callback`;
}

export function getPostAuthRedirectPath() {
  return process.env.POST_AUTH_REDIRECT_PATH || '/calendar';
}

export function getLogoutRedirectPath() {
  return process.env.POST_LOGOUT_REDIRECT_PATH || '/';
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getOAuthStateCookieName() {
  return OAUTH_STATE_COOKIE_NAME;
}

export function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

export function getCookieOptions(overrides = {}) {
  return {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProduction(),
    path: '/',
    ...overrides,
  };
}

export function normalizeReturnTo(request, value) {
  const fallback = getPostAuthRedirectPath();
  if (!value) return fallback;

  if (value.startsWith('/')) {
    return value;
  }

  try {
    const candidate = new URL(value);
    const appBaseUrl = getAppBaseUrl(request);
    if (candidate.origin === appBaseUrl) {
      return `${candidate.pathname}${candidate.search}${candidate.hash}`;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
