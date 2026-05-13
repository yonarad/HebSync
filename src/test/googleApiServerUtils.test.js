import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOpaqueToken,
  decryptSecret,
  encryptSecret,
  hashToken,
  signToken,
} from '../../api/_lib/crypto.js';

const { getValidGoogleAccessTokenMock } = vi.hoisted(() => ({
  getValidGoogleAccessTokenMock: vi.fn(),
}));

vi.mock('../../api/_lib/google.js', () => ({
  getValidGoogleAccessToken: getValidGoogleAccessTokenMock,
}));

import {
  authorizedGoogleFetch,
  listCalendars,
} from '../../api/_lib/google-calendar.js';

describe('server-side Google helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getValidGoogleAccessTokenMock.mockReset();
    process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  it('round-trips encrypted secrets and signs tokens deterministically', () => {
    const ciphertext = encryptSecret('secret-value');

    expect(ciphertext).not.toBe('secret-value');
    expect(decryptSecret(ciphertext)).toBe('secret-value');
    expect(hashToken('abc')).toHaveLength(64);
    expect(createOpaqueToken(16)).toBeTruthy();
    expect(signToken('abc', 'session')).toBe(signToken('abc', 'session'));
  });

  it('adds the Google bearer token to authorized requests', async () => {
    getValidGoogleAccessTokenMock.mockResolvedValue('google-token');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await authorizedGoogleFetch(
      { google_connection_id: 'conn_1' },
      'https://example.com/calendars',
      { method: 'GET' },
    );

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer google-token');
  });

  it('maps revoked-token failures to AUTH_EXPIRED', async () => {
    getValidGoogleAccessTokenMock.mockRejectedValue(
      new Error('Token has been expired or revoked'),
    );

    await expect(
      authorizedGoogleFetch(
        { google_connection_id: 'conn_1' },
        'https://example.com/calendars',
      ),
    ).rejects.toMatchObject({
      code: 'AUTH_EXPIRED',
      status: 401,
    });
  });

  it('filters calendar lists for app-created sessions', async () => {
    getValidGoogleAccessTokenMock.mockResolvedValue('google-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'cal1',
              description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
            },
            {
              id: 'cal2',
              description: 'Personal calendar',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const items = await listCalendars({
      google_connection_id: 'conn_1',
      scope_mode: 'app_created',
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('cal1');
  });
});
