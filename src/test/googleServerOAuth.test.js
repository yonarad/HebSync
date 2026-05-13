import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  decryptSecretMock,
  encryptSecretMock,
  getSqlMock,
  sqlMock,
} = vi.hoisted(() => ({
  decryptSecretMock: vi.fn(),
  encryptSecretMock: vi.fn((value) => `enc:${value}`),
  getSqlMock: vi.fn(),
  sqlMock: vi.fn(),
}));

vi.mock('../../api/_lib/crypto.js', () => ({
  decryptSecret: decryptSecretMock,
  encryptSecret: encryptSecretMock,
}));

vi.mock('../../api/_lib/db.js', () => ({
  getSql: getSqlMock,
}));

import {
  buildGoogleConsentUrl,
  exchangeCodeForTokens,
  getValidGoogleAccessToken,
  parseIdToken,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  upsertGoogleConnection,
} from '../../api/_lib/google.js';

describe('server OAuth helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sqlMock.mockReset();
    getSqlMock.mockReturnValue(sqlMock);
    decryptSecretMock.mockReset();
    encryptSecretMock.mockClear();
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
  });

  it('builds a consent url with the selected scope mode', () => {
    const url = new URL(
      buildGoogleConsentUrl({
        clientId: 'client-id',
        redirectUri: 'https://app.example.com/callback',
        state: 'state-123',
        scopeMode: 'all_events',
      }),
    );

    expect(url.origin + url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('scope')).toContain(
      'https://www.googleapis.com/auth/calendar.events',
    );
  });

  it('parses a Google id_token payload', () => {
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'google-user-1',
        email: 'user@example.com',
      }),
    ).toString('base64url');

    expect(parseIdToken(`header.${payload}.sig`)).toEqual({
      googleUserId: 'google-user-1',
      email: 'user@example.com',
    });
  });

  it('exchanges and refreshes tokens through Google endpoints', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'access-1',
            refresh_token: 'refresh-1',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'access-2',
            expires_in: 3600,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const exchanged = await exchangeCodeForTokens({
      code: 'abc',
      redirectUri: 'https://app.example.com/callback',
    });
    const refreshed = await refreshGoogleAccessToken('refresh-token');

    expect(exchanged.access_token).toBe('access-1');
    expect(refreshed.access_token).toBe('access-2');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('revokes tokens and surfaces provider failures', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response('bad revoke', { status: 400 }));

    await expect(revokeGoogleToken('token-1')).resolves.toBe(true);
    await expect(revokeGoogleToken('token-2')).rejects.toThrow('bad revoke');
  });

  it('upserts Google connections with encrypted refresh tokens', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 'conn_1', scope_mode: 'all_events' }]);

    const row = await upsertGoogleConnection({
      googleUserId: 'google-user-1',
      email: 'user@example.com',
      name: 'User',
      picture: 'https://example.com/pic.png',
      scopeMode: 'all_events',
      refreshToken: 'refresh-token',
      accessToken: 'access-token',
      accessTokenExpiresIn: 3600,
    });

    expect(encryptSecretMock).toHaveBeenCalledWith('refresh-token');
    expect(row).toEqual({ id: 'conn_1', scope_mode: 'all_events' });
  });

  it('reuses valid access tokens and refreshes expired ones', async () => {
    sqlMock
      .mockResolvedValueOnce([
        {
          id: 'conn_1',
          access_token: 'still-valid',
          access_token_expires_at: new Date(Date.now() + 120000).toISOString(),
          encrypted_refresh_token: 'enc:refresh',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'conn_2',
          access_token: 'expired-token',
          access_token_expires_at: new Date(Date.now() - 120000).toISOString(),
          encrypted_refresh_token: 'enc:refresh-2',
        },
      ])
      .mockResolvedValueOnce([]);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'fresh-token',
          expires_in: 3600,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    decryptSecretMock.mockReturnValue('refresh-2');

    await expect(getValidGoogleAccessToken('conn_1')).resolves.toBe('still-valid');
    await expect(getValidGoogleAccessToken('conn_2')).resolves.toBe('fresh-token');

    expect(decryptSecretMock).toHaveBeenCalledWith('enc:refresh-2');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(sqlMock).toHaveBeenCalledTimes(3);
  });
});
