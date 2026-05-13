import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_STATE_STORAGE_KEY,
  authenticateWithGoogle,
  buildSpecialDateMetadata,
  canEditCalendars,
  createNewCalendar,
  createHebcalEvent,
  deleteAccountData,
  deleteEvent,
  fetchAllCalendars,
  fetchEventsInRange,
  fetchMyAppEvents,
  fetchSession,
  getAccessToken,
  getScopeMode,
  logout,
  revokeAccess,
  updateEvent,
  usesAllCalendarsMode,
} from '../utils/googleApi';

describe('googleApi client utilities', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    logout();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('stores authenticated session state and exposes a server-session token marker', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authenticated: true,
          user: {
            scopeMode: 'all_events',
            csrfToken: 'csrf-token',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const session = await fetchSession();

    expect(session).toEqual({
      scopeMode: 'all_events',
      csrfToken: 'csrf-token',
    });
    expect(localStorage.getItem(AUTH_STATE_STORAGE_KEY)).toContain('all_events');
    expect(getAccessToken()).toBe('server-session');
  });

  it('filters calendar results when the backend reports app-created scope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'cal1',
              summary: 'HebSync',
              accessRole: 'owner',
              description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
            },
            {
              id: 'cal2',
              summary: 'Other',
              accessRole: 'reader',
              description: 'Personal',
            },
          ],
          scopeMode: 'app_created',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const calendars = await fetchAllCalendars();

    expect(calendars).toHaveLength(1);
    expect(calendars[0].id).toBe('cal1');
  });

  it('loads a session for csrf and sends the token when creating a calendar', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              scopeMode: 'all_events',
              csrfToken: 'csrf-123',
            },
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
            id: 'new-cal',
            summary: 'New Calendar',
            accessRole: 'owner',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const calendar = await createNewCalendar('New Calendar');

    expect(calendar.id).toBe('new-cal');
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const [, createOptions] = fetchSpy.mock.calls[1];
    const headers = new Headers(createOptions?.headers);
    expect(headers.get('x-csrf-token')).toBe('csrf-123');
    expect(createOptions?.method).toBe('POST');
    expect(createOptions?.body).toBe(JSON.stringify({ summary: 'New Calendar' }));
  });

  it('short-circuits event range fetches when no calendar ids are provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const events = await fetchEventsInRange(
      '2026-05-01T00:00:00.000Z',
      '2026-05-31T23:59:59.999Z',
      [],
    );

    expect(events).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('redirects browser auth to the server-side Google start endpoint', () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://hebsync.app',
        pathname: '/',
        search: '',
        hash: '',
        assign: assignSpy,
      },
      writable: true,
      configurable: true,
    });

    authenticateWithGoogle('read_only');

    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(assignSpy.mock.calls[0][0]).toContain('/api/auth/google/start');
    expect(assignSpy.mock.calls[0][0]).toContain('scopeMode=read_only');
    expect(assignSpy.mock.calls[0][0]).toContain('returnTo=%2Fcalendar');
  });

  it('clears local auth state after revoke and account deletion', async () => {
    localStorage.setItem(AUTH_STATE_STORAGE_KEY, '{"authenticated":true,"scopeMode":"all_events"}');

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              scopeMode: 'all_events',
              csrfToken: 'csrf-1',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              scopeMode: 'all_events',
              csrfToken: 'csrf-2',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await revokeAccess();
    expect(localStorage.getItem(AUTH_STATE_STORAGE_KEY)).toBeNull();

    localStorage.setItem(AUTH_STATE_STORAGE_KEY, '{"authenticated":true,"scopeMode":"all_events"}');
    await deleteAccountData();
    expect(localStorage.getItem(AUTH_STATE_STORAGE_KEY)).toBeNull();
  });

  it('derives scope helpers from stored auth state', () => {
    localStorage.setItem(
      AUTH_STATE_STORAGE_KEY,
      JSON.stringify({ authenticated: true, scopeMode: 'read_only' }),
    );

    expect(getScopeMode()).toBe('read_only');
    expect(usesAllCalendarsMode()).toBe(true);
    expect(canEditCalendars()).toBe(false);
    expect(usesAllCalendarsMode('all_events')).toBe(true);
    expect(canEditCalendars('app_created')).toBe(true);
  });

  it('drops malformed auth state and handles 401 session responses', async () => {
    localStorage.setItem(AUTH_STATE_STORAGE_KEY, '{bad-json');
    expect(getScopeMode()).toBeNull();
    expect(localStorage.getItem(AUTH_STATE_STORAGE_KEY)).toBeNull();

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 401 }),
    );

    await expect(fetchSession()).resolves.toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('supports nested csrf tokens in the session payload and falls back to stored scope for calendars', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              scopeMode: 'app_created',
              user: {
                csrfToken: 'nested-csrf',
              },
            },
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
            items: [
              {
                id: 'cal1',
                summary: 'HebSync',
                accessRole: 'owner',
                description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
              },
              {
                id: 'cal2',
                summary: 'Other',
                accessRole: 'reader',
                description: 'Personal',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    await fetchSession();
    const calendars = await fetchAllCalendars();

    expect(calendars).toHaveLength(1);
    expect(calendars[0].id).toBe('cal1');
  });

  it('fetches app events and posts the selected calendar ids', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              scopeMode: 'all_events',
              csrfToken: 'csrf-events',
            },
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
            items: [{ id: 'evt1', summary: 'Event 1', calendarId: 'cal1' }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const events = await fetchMyAppEvents(['cal1']);

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('evt1');
  });

  it('creates, updates, and deletes events through the server endpoints', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              scopeMode: 'all_events',
              csrfToken: 'csrf-write',
            },
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
            id: 'evt-created',
            summary: 'Birthday',
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
            id: 'evt-created',
            summary: 'Updated birthday',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://hebsync.app',
      },
      writable: true,
      configurable: true,
    });

    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '11111111-1111-1111-1111-111111111111',
    );

    const created = await createHebcalEvent(
      'Birthday',
      'birthday',
      5784,
      'VALUE=DATE:20261110,VALUE=DATE:20271129',
      'cal1',
      'remember candles',
      {
        specialDate: {
          monthName: 'Cheshvan',
          day: 30,
          fallback: '29th',
        },
      },
    );
    const updated = await updateEvent('cal1', 'evt-created', {
      summary: 'Updated birthday',
    });
    const deleted = await deleteEvent('cal1', 'evt-created');

    expect(created.id).toBe('evt-created');
    expect(updated.summary).toBe('Updated birthday');
    expect(deleted).toBe(true);
  });

  it('guards missing calendar ids and covers metadata fallbacks', async () => {
    await expect(
      createHebcalEvent('Birthday', 'birthday', 5784, 'VALUE=DATE:20261110', ''),
    ).rejects.toThrow('No calendar selected');

    expect(
      buildSpecialDateMetadata({
        monthName: 'Cheshvan',
        day: 30,
      }),
    ).toBe('תאריך מיוחד: ל׳ בחשוון.');
    expect(
      buildSpecialDateMetadata({
        monthName: 'Cheshvan',
        day: 29,
        fallback: '29th',
      }),
    ).toBe('');
  });
});
