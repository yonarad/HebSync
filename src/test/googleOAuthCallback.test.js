import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/_lib/cookies.js', () => ({
  parseCookies: vi.fn(),
  serializeCookie: vi.fn(() => 'mock-cookie=value'),
}));

vi.mock('../../api/_lib/sessions.js', () => ({
  createSession: vi.fn(),
  getSessionMaxAgeSeconds: vi.fn(() => 60),
}));

vi.mock('../../api/_lib/env.js', () => ({
  getCookieOptions: vi.fn(() => ({ path: '/', httpOnly: true })),
  getOAuthStateCookieName: vi.fn(() => 'hebsync_oauth_state'),
  getPostAuthRedirectPath: vi.fn(() => '/calendar'),
  getSessionCookieName: vi.fn(() => 'hebsync_session'),
  getGoogleRedirectUri: vi.fn(() => 'https://app.example.com/api/auth/google/callback'),
}));

vi.mock('../../api/_lib/google.js', () => ({
  exchangeCodeForTokens: vi.fn(),
  parseIdToken: vi.fn(),
  upsertGoogleConnection: vi.fn(),
}));

const { parseCookies } = await import('../../api/_lib/cookies.js');
const { createSession } = await import('../../api/_lib/sessions.js');
const { exchangeCodeForTokens, parseIdToken, upsertGoogleConnection } = await import('../../api/_lib/google.js');
const { GET } = await import('../../api/auth/google/callback.js');

describe('OAuth callback error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects invalid auth state back to the home page with an auth error code', async () => {
    vi.mocked(parseCookies).mockReturnValue({});

    const response = await GET(
      new Request('https://app.example.com/api/auth/google/callback?code=abc&state=returned'),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://app.example.com/?authError=invalid_auth_state',
    );
  });

  it('redirects provider access_denied errors back to the home page with details', async () => {
    const response = await GET(
      new Request('https://app.example.com/api/auth/google/callback?error=access_denied'),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://app.example.com/?authError=google_oauth_error&authErrorDetail=access_denied',
    );
  });

  it('redirects unexpected callback failures back to the home page', async () => {
    vi.mocked(parseCookies).mockReturnValue({
      hebsync_oauth_state: JSON.stringify({
        state: 'returned',
        scopeMode: 'app_created',
        returnTo: '/calendar',
      }),
    });
    vi.mocked(exchangeCodeForTokens).mockRejectedValue(new Error('token exchange failed'));

    const response = await GET(
      new Request('https://app.example.com/api/auth/google/callback?code=abc&state=returned'),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://app.example.com/?authError=authentication_failed',
    );
    expect(parseIdToken).not.toHaveBeenCalled();
    expect(upsertGoogleConnection).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });
});
