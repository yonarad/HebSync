import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useMyCalendarData from '../hooks/useMyCalendarData';
import {
  authenticateWithGoogle,
  createNewCalendar,
  fetchAllCalendars,
  fetchEventsInRange,
  fetchMyAppEvents,
  fetchSession,
  GCAL_AUTH_EXPIRED_EVENT,
  revokeAccess,
  SCOPE_MODES,
} from '../utils/googleApi';

vi.mock('../utils/calendarView', () => ({
  getHebrewMonthGregorianRange: vi.fn(() => ({
    timeMin: '2026-05-01T00:00:00.000Z',
    timeMax: '2026-05-31T23:59:59.999Z',
  })),
}));

vi.mock('../utils/googleCalendarColors', () => ({
  resolveCalendarColor: vi.fn((calendar) =>
    calendar.id === 'heb' ? '#00AA00' : '#0038A8',
  ),
}));

vi.mock('../utils/googleApi', () => ({
  GCAL_AUTH_EXPIRED_EVENT: 'gcal-auth-expired',
  getAccessToken: vi.fn(() => 'mock-token'),
  getScopeMode: vi.fn(() => 'all_events'),
  fetchSession: vi.fn(async () => ({ scopeMode: 'all_events' })),
  fetchAllCalendars: vi.fn(async () => [
    {
      id: 'heb',
      summary: 'HebSync',
      accessRole: 'owner',
      description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
    },
    {
      id: 'other',
      summary: 'Personal',
      accessRole: 'owner',
    },
  ]),
  fetchGoogleCalendarColors: vi.fn(async () => ({ calendar: {} })),
  fetchEventsInRange: vi.fn(async () => []),
  fetchMyAppEvents: vi.fn(async () => []),
  authenticateWithGoogle: vi.fn(),
  canEditCalendars: vi.fn((scopeMode) => scopeMode === 'app_created' || scopeMode === 'all_events'),
  usesAllCalendarsMode: vi.fn((scopeMode) => scopeMode === 'read_only' || scopeMode === 'all_events'),
  isHebSyncCalendar: vi.fn(
    (calendar) =>
      Boolean(calendar?.description?.includes('ID:hebcal-sync-app')),
  ),
  revokeAccess: vi.fn(async () => {}),
  createNewCalendar: vi.fn(async () => {}),
  isAuthError: vi.fn((error) => error?.code === 'AUTH_EXPIRED'),
  SCOPE_MODES: {
    APP_CREATED: 'app_created',
    READ_ONLY: 'read_only',
    ALL_EVENTS: 'all_events',
  },
}));

describe('useMyCalendarData', () => {
  const t = (key: string, options?: Record<string, unknown>) =>
    options?.message ? `${key}:${options.message}` : key;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads calendars and selects only HebSync calendars by default', async () => {
    const { result } = renderHook(() => useMyCalendarData({ t }));

    await waitFor(() => {
      expect(result.current.calendars).toHaveLength(2);
    });

    expect(fetchSession).toHaveBeenCalled();
    expect(fetchAllCalendars).toHaveBeenCalled();
    expect(fetchEventsInRange).toHaveBeenCalled();
    expect(fetchMyAppEvents).toHaveBeenCalled();
    expect(result.current.selectedCalendarIds).toEqual(['heb']);
    expect(result.current.hebSyncCalendars).toHaveLength(1);
    expect(result.current.otherCalendars).toHaveLength(1);
    expect(result.current.getCalendarColor('heb')).toBe('#00AA00');
  });

  it('opens reauthorize mode and clears data when auth expires', async () => {
    const { result } = renderHook(() => useMyCalendarData({ t }));

    await waitFor(() => {
      expect(result.current.calendars).toHaveLength(2);
    });

    act(() => {
      window.dispatchEvent(new CustomEvent(GCAL_AUTH_EXPIRED_EVENT));
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.scopeMode).toBeNull();
    expect(result.current.calendars).toEqual([]);
    expect(result.current.selectedCalendarIds).toEqual([]);
    expect(result.current.loginModalMode).toBe('reauthorize');
    expect(result.current.showLoginModal).toBe(true);
  });

  it('switches all-calendars users back to connect mode after revoking access', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { result } = renderHook(() => useMyCalendarData({ t }));

    await waitFor(() => {
      expect(result.current.isAllCalendarsMode).toBe(true);
    });

    await act(async () => {
      await result.current.handleChangePermissions();
    });

    expect(revokeAccess).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.scopeMode).toBeNull();
    expect(result.current.loginModalMode).toBe('connect');
    expect(result.current.loginModalInitialScopeMode).toBe(SCOPE_MODES.APP_CREATED);
    expect(result.current.showLoginModal).toBe(true);
  });

  it('disables editing and reconnects in read-only mode', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { result } = renderHook(() => useMyCalendarData({ t }));

    await waitFor(() => {
      expect(result.current.calendars).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleDisableEditing();
    });

    expect(revokeAccess).toHaveBeenCalledTimes(1);
    expect(authenticateWithGoogle).toHaveBeenCalledWith(SCOPE_MODES.READ_ONLY);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.calendars).toEqual([]);
    expect(result.current.selectedCalendarIds).toEqual([]);
  });

  it('creates a new calendar and reloads calendars', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('New Calendar');

    const { result } = renderHook(() => useMyCalendarData({ t }));

    await waitFor(() => {
      expect(result.current.calendars).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleCreateCalendar();
    });

    expect(createNewCalendar).toHaveBeenCalledWith('New Calendar');
    expect(fetchAllCalendars).toHaveBeenCalledTimes(2);
  });

  it('marks auth redirect as in progress immediately after selecting a login scope', async () => {
    const { result } = renderHook(() => useMyCalendarData({ t }));

    await waitFor(() => {
      expect(result.current.hasResolvedSession).toBe(true);
    });

    act(() => {
      result.current.onLoginSelect(SCOPE_MODES.APP_CREATED);
    });

    expect(result.current.isAuthRedirecting).toBe(true);
    expect(result.current.showLoginModal).toBe(false);
    expect(authenticateWithGoogle).toHaveBeenCalledWith(
      SCOPE_MODES.APP_CREATED,
      undefined,
      expect.any(Function),
    );
  });
});
