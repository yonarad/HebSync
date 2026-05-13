import { formatHebrewYear, requires30thFallbackDecision } from './hebcal';
import type {
  Calendar,
  CreateHebcalEventOptions,
  GoogleCalendarColors,
  GoogleCalendarEvent,
  ScopeMode,
  SessionResponse,
  SessionUser,
  SpecialDateMetadataInput,
  StoredAuthState,
} from '../types/appTypes';

export const GCAL_AUTH_EXPIRED_EVENT = 'gcal-auth-expired';
export const AUTH_STATE_STORAGE_KEY = 'gcal_auth_state';
export const SCOPE_MODES = {
  APP_CREATED: 'app_created',
  READ_ONLY: 'read_only',
  ALL_EVENTS: 'all_events',
} as const;

const AUTH_ERROR_CODE = 'AUTH_EXPIRED';
const APP_SIGNATURE = 'ID:hebcal-sync-app';
const ORIGINAL_YEAR_PREFIX = '\u05e9\u05e0\u05ea \u05de\u05e7\u05d5\u05e8: ';
const CREATED_BY_LABEL = '\u05e0\u05d5\u05e6\u05e8 \u05e2"\u05d9 "\u05e2\u05d1\u05e8\u05d9 \u05dc\u05d9\u05d5\u05de\u05df - HebSync"';
const SPECIAL_DATE_PREFIX = '\u05ea\u05d0\u05e8\u05d9\u05da \u05de\u05d9\u05d5\u05d7\u05d3: \u05dc\u05f3 \u05d1';

interface GoogleApiError extends Error {
  code?: string;
}

interface GoogleApiListResponse<T> {
  items?: T[];
  scopeMode?: ScopeMode;
}

interface CreateEventPayload {
  summary: string;
  description: string;
  start: {
    date: string;
  };
  end: {
    date: string;
  };
  recurrence: string[];
  extendedProperties: {
    private: {
      appIdentifier: string;
      originalHebrewYear: string;
      eventID: string;
      category: string;
    };
  };
}

let inMemoryCsrfToken: string | null = null;

export function isHebSyncCalendar(calendar: Calendar | null | undefined): boolean {
  return Boolean(
    calendar?.description && calendar.description.includes(APP_SIGNATURE),
  );
}

function createAuthError(message = 'Google session expired'): GoogleApiError {
  const error: GoogleApiError = new Error(message);
  error.code = AUTH_ERROR_CODE;
  return error;
}

function notifyAuthExpired(): GoogleApiError {
  logout();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GCAL_AUTH_EXPIRED_EVENT));
  }
  return createAuthError();
}

function getStoredAuthState(): StoredAuthState | null {
  const raw = localStorage.getItem(AUTH_STATE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAuthState;
  } catch {
    localStorage.removeItem(AUTH_STATE_STORAGE_KEY);
    return null;
  }
}

function setStoredAuthState(session: SessionUser): void {
  if (!session?.scopeMode) {
    logout();
    return;
  }

  localStorage.setItem(
    AUTH_STATE_STORAGE_KEY,
    JSON.stringify({
      authenticated: true,
      scopeMode: session.scopeMode,
    } satisfies StoredAuthState),
  );
}

function getCsrfToken(): string | null {
  return inMemoryCsrfToken;
}

export function isAuthError(error: unknown): error is GoogleApiError {
  return (error as GoogleApiError | null | undefined)?.code === AUTH_ERROR_CODE;
}

async function readGoogleError(
  response: Response,
  fallbackMessage: string,
): Promise<never> {
  let errorMessage = fallbackMessage;
  let errorCode: string | null = null;

  try {
    const errorData = (await response.clone().json()) as {
      code?: string;
      error?: { message?: string } | string;
      message?: string;
      error_description?: string;
    };
    errorCode = errorData?.code || null;
    errorMessage =
      (typeof errorData?.error === 'object' ? errorData.error?.message : errorData?.error) ||
      errorData?.message ||
      errorData?.error_description ||
      fallbackMessage;
  } catch {
    const text = await response.text().catch(() => '');
    errorMessage = text || fallbackMessage;
  }

  if (response.status === 401 || errorCode === AUTH_ERROR_CODE) {
    throw notifyAuthExpired();
  }

  throw new Error(errorMessage);
}

async function authorizedFetch(
  url: string,
  options: RequestInit = {},
  fallbackMessage = 'Google request failed',
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
      await fetchSession();
    }

    const resolvedCsrfToken = getCsrfToken();
    if (!resolvedCsrfToken) {
      throw notifyAuthExpired();
    }

    headers.set('x-csrf-token', resolvedCsrfToken);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    await readGoogleError(response, fallbackMessage);
  }

  return response;
}

export function authenticateWithGoogle(
  scopeMode: Exclude<ScopeMode, null>,
  onSuccess?: (() => void) | null,
  onError?: ((error: Error) => void) | null,
): void {
  try {
    const returnTo =
      typeof window !== 'undefined'
        ? window.location.pathname === '/'
          ? '/calendar'
          : `${window.location.pathname}${window.location.search}${window.location.hash}`
        : '/calendar';
    const url = new URL('/api/auth/google/start', window.location.origin);
    url.searchParams.set('scopeMode', scopeMode);
    url.searchParams.set('returnTo', returnTo);
    onSuccess?.();
    window.location.assign(url.toString());
  } catch (error) {
    onError?.(error as Error);
  }
}

export function getScopeMode(): ScopeMode {
  return getStoredAuthState()?.scopeMode || null;
}

export function usesAllCalendarsMode(scopeMode: ScopeMode = getScopeMode()): boolean {
  return scopeMode === SCOPE_MODES.READ_ONLY || scopeMode === SCOPE_MODES.ALL_EVENTS;
}

export function canEditCalendars(scopeMode: ScopeMode = getScopeMode()): boolean {
  return scopeMode === SCOPE_MODES.APP_CREATED || scopeMode === SCOPE_MODES.ALL_EVENTS;
}

export function getAccessToken(): 'server-session' | null {
  return getStoredAuthState()?.authenticated ? 'server-session' : null;
}

export async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch('/api/auth/session', {
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    notifyAuthExpired();
    return null;
  }

  if (!response.ok) {
    await readGoogleError(response, 'Failed to fetch session');
  }

  const data = (await response.json()) as SessionResponse;
  if (data?.authenticated && data?.user) {
    inMemoryCsrfToken = data.user.csrfToken || data.user.user?.csrfToken || null;
    setStoredAuthState(data.user);
    return data.user;
  }

  logout();
  return null;
}

export function logout(): void {
  inMemoryCsrfToken = null;
  localStorage.removeItem(AUTH_STATE_STORAGE_KEY);
  localStorage.removeItem('gcal_app_calendar_id');
}

export async function revokeAccess(): Promise<void> {
  try {
    await authorizedFetch('/api/auth/logout', { method: 'POST' }, 'Failed to revoke access');
  } catch (error) {
    console.error('Failed to revoke token:', error);
  } finally {
    logout();
  }
}

export async function deleteAccountData(): Promise<void> {
  try {
    await authorizedFetch(
      '/api/auth/account',
      { method: 'DELETE' },
      'Failed to delete account data',
    );
  } finally {
    logout();
  }
}

export async function fetchAllCalendars(): Promise<Calendar[]> {
  const response = await authorizedFetch(
    '/api/google/calendars',
    {},
    'Failed to fetch calendars',
  );
  const data = (await response.json()) as GoogleApiListResponse<Calendar>;
  const items = data.items || [];

  const mode = data.scopeMode || getScopeMode();
  if (mode === SCOPE_MODES.APP_CREATED) {
    return items.filter(isHebSyncCalendar);
  }

  return items;
}

export async function fetchGoogleCalendarColors(): Promise<GoogleCalendarColors> {
  const response = await authorizedFetch(
    '/api/google/colors',
    {},
    'Failed to fetch Google calendar colors',
  );
  return (await response.json()) as GoogleCalendarColors;
}

export async function createNewCalendar(summary: string): Promise<Calendar> {
  const response = await authorizedFetch(
    '/api/google/calendars',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ summary }),
    },
    'Failed to create calendar',
  );

  return (await response.json()) as Calendar;
}

export async function fetchMyAppEvents(
  calendarIds: string[] = [],
): Promise<GoogleCalendarEvent[]> {
  if (calendarIds.length === 0) return [];

  const response = await authorizedFetch(
    '/api/google/events/app',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ calendarIds }),
    },
    'Failed to fetch events',
  );
  const data = (await response.json()) as GoogleApiListResponse<GoogleCalendarEvent>;
  return data.items || [];
}

export async function fetchEventsInRange(
  timeMin: string,
  timeMax: string,
  calendarIds: string[] = [],
): Promise<GoogleCalendarEvent[]> {
  if (calendarIds.length === 0) return [];

  const response = await authorizedFetch(
    '/api/google/events/in-range',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timeMin, timeMax, calendarIds }),
    },
    'Failed to fetch calendar events',
  );
  const data = (await response.json()) as GoogleApiListResponse<GoogleCalendarEvent>;
  return data.items || [];
}

export async function createHebcalEvent(
  title: string,
  category: string,
  originalHebrewYear: string | number,
  rdateString: string,
  calendarId: string,
  userDescription = '',
  options: CreateHebcalEventOptions = {},
): Promise<GoogleCalendarEvent> {
  if (!calendarId) throw new Error('No calendar selected');

  const eventId = crypto.randomUUID();
  const rdates = rdateString.split(',');
  const firstDateStr = rdates[0].replace('VALUE=DATE:', '');
  const remainingRdates = rdates.slice(1);

  const startDateFormatted = `${firstDateStr.substring(0, 4)}-${firstDateStr.substring(4, 6)}-${firstDateStr.substring(6, 8)}`;

  const originalYearNumber = Number(originalHebrewYear);
  const originalHebrewYearLabel = Number.isFinite(originalYearNumber)
    ? `${ORIGINAL_YEAR_PREFIX}${formatHebrewYear(originalYearNumber)} - ${originalHebrewYear}`
    : `${ORIGINAL_YEAR_PREFIX}${originalHebrewYear}`;
  const specialDateMetadata = buildSpecialDateMetadata(options.specialDate);
  const metadataParts = [originalHebrewYearLabel];
  if (specialDateMetadata) {
    metadataParts.push(specialDateMetadata);
  }
  metadataParts.push(CREATED_BY_LABEL);
  const metadata = metadataParts.join('\n');
  const finalDescription = userDescription
    ? `${userDescription}\n\n---\n${metadata}`
    : metadata;

  const eventPayload: CreateEventPayload = {
    summary: title,
    description: finalDescription,
    start: {
      date: startDateFormatted,
    },
    end: {
      date: startDateFormatted,
    },
    recurrence: remainingRdates.length > 0 ? chunkRdates(remainingRdates) : [],
    extendedProperties: {
      private: {
        appIdentifier: 'MyHebrewCalendar',
        originalHebrewYear: String(originalHebrewYear),
        eventID: eventId,
        category,
      },
    },
  };

  const response = await authorizedFetch(
    '/api/google/events',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calendarId,
        eventPayload,
      }),
    },
    'Failed to create event',
  );

  return (await response.json()) as GoogleCalendarEvent;
}

export async function updateEvent(
  calendarId: string,
  googleEventId: string,
  updates: Partial<GoogleCalendarEvent>,
): Promise<GoogleCalendarEvent> {
  const url = new URL('/api/google/event', window.location.origin);
  url.searchParams.set('calendarId', calendarId);
  url.searchParams.set('eventId', googleEventId);

  const response = await authorizedFetch(
    url.toString(),
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    },
    'Failed to update event',
  );

  return (await response.json()) as GoogleCalendarEvent;
}

export async function deleteEvent(
  calendarId: string,
  googleEventId: string,
): Promise<true> {
  const url = new URL('/api/google/event', window.location.origin);
  url.searchParams.set('calendarId', calendarId);
  url.searchParams.set('eventId', googleEventId);

  await authorizedFetch(
    url.toString(),
    {
      method: 'DELETE',
    },
    'Failed to delete event',
  );

  return true;
}

const SPECIAL_DATE_MONTH_LABELS: Record<string, string> = {
  Cheshvan: '\u05d7\u05e9\u05d5\u05d5\u05df',
  Kislev: '\u05db\u05e1\u05dc\u05d5',
  'Adar I': '\u05d0\u05d3\u05e8 \u05d0\u05f3',
};

const SPECIAL_DATE_FALLBACK_LABELS: Record<string, string> = {
  '29th': '\u05d1\u05e9\u05e0\u05d9\u05dd \u05e9\u05d1\u05d4\u05df \u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d0 \u05e7\u05d9\u05d9\u05dd, \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2 \u05de\u05d5\u05e7\u05d3\u05dd \u05dc\u05db\u05f4\u05d8 \u05d1\u05d0\u05d5\u05ea\u05d5 \u05d7\u05d5\u05d3\u05e9.',
  '1st': '\u05d1\u05e9\u05e0\u05d9\u05dd \u05e9\u05d1\u05d4\u05df \u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d0 \u05e7\u05d9\u05d9\u05dd, \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2 \u05e0\u05d3\u05d7\u05d4 \u05dc\u05d0\u05f3 \u05d1\u05d7\u05d5\u05d3\u05e9 \u05d4\u05d1\u05d0.',
  skip: '\u05d1\u05e9\u05e0\u05d9\u05dd \u05e9\u05d1\u05d4\u05df \u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d0 \u05e7\u05d9\u05d9\u05dd, \u05d0\u05d5\u05ea\u05d4 \u05e9\u05e0\u05d4 \u05de\u05d3\u05d5\u05dc\u05d2\u05ea \u05d5\u05dc\u05d0 \u05e0\u05d5\u05e6\u05e8 \u05de\u05d5\u05e4\u05e2.',
};

export function buildSpecialDateMetadata(
  specialDate?: SpecialDateMetadataInput | null,
): string {
  if (!specialDate) return '';

  const { monthName, day, fallback } = specialDate;
  if (!requires30thFallbackDecision(monthName, day)) {
    return '';
  }

  const monthLabel = SPECIAL_DATE_MONTH_LABELS[monthName] || monthName;
  const fallbackLabel = fallback ? SPECIAL_DATE_FALLBACK_LABELS[fallback] : '';

  if (!fallbackLabel) {
    return `${SPECIAL_DATE_PREFIX}${monthLabel}.`;
  }

  return `${SPECIAL_DATE_PREFIX}${monthLabel}\n${fallbackLabel}`;
}

function chunkRdates(rdates: string[]): string[] {
  const chunkSize = 80;
  const recurrenceLines: string[] = [];

  for (let i = 0; i < rdates.length; i += chunkSize) {
    const chunk = rdates.slice(i, i + chunkSize);
    const cleanChunk = chunk.map((rdate) => rdate.replace('VALUE=DATE:', ''));
    recurrenceLines.push(`RDATE;VALUE=DATE:${cleanChunk.join(',')}`);
  }

  return recurrenceLines;
}
