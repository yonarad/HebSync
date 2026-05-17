import { formatHebrewYear, requires30thFallbackDecision } from './hebcal';
import type {
  Calendar,
  CreateHebcalEventOptions,
  GoogleCalendarDateTime,
  GoogleCalendarColors,
  GoogleCalendarEvent,
  EventSearchParams,
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

export type RecurringEventActionScope = 'single' | 'series' | 'future';

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

export async function searchEvents(
  params: EventSearchParams,
): Promise<GoogleCalendarEvent[]> {
  if ((params.calendarIds || []).length === 0) return [];

  const response = await authorizedFetch(
    '/api/google/events/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    },
    'Failed to search calendar events',
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

export function isRecurringEvent(event: GoogleCalendarEvent | null | undefined): boolean {
  return Boolean(event?.recurringEventId || (event?.recurrence?.length ?? 0) > 0);
}

export function supportsFutureScopedChanges(
  event: GoogleCalendarEvent | null | undefined,
): boolean {
  const appIdentifier = event?.extendedProperties?.private?.appIdentifier;
  return appIdentifier === 'MyHebrewCalendar' && isRecurringEvent(event);
}

export async function fetchEvent(
  calendarId: string,
  googleEventId: string,
): Promise<GoogleCalendarEvent> {
  const url = new URL('/api/google/event', window.location.origin);
  url.searchParams.set('calendarId', calendarId);
  url.searchParams.set('eventId', googleEventId);

  const response = await authorizedFetch(
    url.toString(),
    {},
    'Failed to fetch event',
  );

  return (await response.json()) as GoogleCalendarEvent;
}

async function createGoogleEvent(
  calendarId: string,
  eventPayload: Partial<GoogleCalendarEvent>,
): Promise<GoogleCalendarEvent> {
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

export async function updateRecurringEventScope(
  event: GoogleCalendarEvent,
  updates: Partial<GoogleCalendarEvent>,
  scope: RecurringEventActionScope,
): Promise<GoogleCalendarEvent> {
  if (!event.calendarId || !event.id) {
    throw new Error('Missing calendar or event id');
  }

  if (scope === 'single' || !isRecurringEvent(event)) {
    return updateEvent(event.calendarId, event.id, updates);
  }

  const seriesEventId = event.recurringEventId || event.id;
  if (scope === 'series') {
    return updateEvent(event.calendarId, seriesEventId, updates);
  }

  const seriesEvent = await fetchEvent(event.calendarId, seriesEventId);
  const targetOccurrenceKey = getOccurrenceKey(event);
  const seriesOccurrenceKeys = getSeriesOccurrenceKeys(seriesEvent);
  const targetIndex = targetOccurrenceKey
    ? seriesOccurrenceKeys.indexOf(targetOccurrenceKey)
    : -1;

  if (targetIndex <= 0) {
    return updateEvent(event.calendarId, seriesEventId, updates);
  }

  const previousKeys = seriesOccurrenceKeys.slice(0, targetIndex);
  const futureKeys = seriesOccurrenceKeys.slice(targetIndex);

  if (futureKeys.length === 0) {
    return updateEvent(event.calendarId, seriesEventId, updates);
  }

  await updateEvent(
    event.calendarId,
    seriesEventId,
    buildSeriesTimingPatch(seriesEvent, previousKeys),
  );

  const futureSeriesPayload = buildSeriesEventPayload(seriesEvent, futureKeys, updates);
  return createGoogleEvent(event.calendarId, futureSeriesPayload);
}

export async function deleteRecurringEventScope(
  event: GoogleCalendarEvent,
  scope: RecurringEventActionScope,
): Promise<true> {
  if (!event.calendarId || !event.id) {
    throw new Error('Missing calendar or event id');
  }

  if (scope === 'single' || !isRecurringEvent(event)) {
    return deleteEvent(event.calendarId, event.id);
  }

  const seriesEventId = event.recurringEventId || event.id;
  if (scope === 'series') {
    return deleteEvent(event.calendarId, seriesEventId);
  }

  const seriesEvent = await fetchEvent(event.calendarId, seriesEventId);
  const targetOccurrenceKey = getOccurrenceKey(event);
  const seriesOccurrenceKeys = getSeriesOccurrenceKeys(seriesEvent);
  const targetIndex = targetOccurrenceKey
    ? seriesOccurrenceKeys.indexOf(targetOccurrenceKey)
    : -1;

  if (targetIndex <= 0) {
    return deleteEvent(event.calendarId, seriesEventId);
  }

  const previousKeys = seriesOccurrenceKeys.slice(0, targetIndex);
  if (previousKeys.length === 0) {
    return deleteEvent(event.calendarId, seriesEventId);
  }

  await updateEvent(
    event.calendarId,
    seriesEventId,
    buildSeriesTimingPatch(seriesEvent, previousKeys),
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

function getOccurrenceKey(event: GoogleCalendarEvent | null | undefined): string | null {
  const dateValue =
    event?.originalStartTime?.date ||
    event?.start?.date ||
    event?.originalStartTime?.dateTime ||
    event?.start?.dateTime;

  if (!dateValue) return null;

  return dateValue.slice(0, 10).replaceAll('-', '');
}

function getSeriesOccurrenceKeys(event: GoogleCalendarEvent): string[] {
  const startKey = getOccurrenceKey(event);
  if (!startKey) {
    throw new Error('Recurring event is missing a start date');
  }

  const recurrenceKeys = (event.recurrence || [])
    .flatMap((line) => parseRdateLine(line))
    .filter(Boolean);

  const allKeys = [startKey, ...recurrenceKeys];
  const uniqueSortedKeys = [...new Set(allKeys)].sort((a, b) => a.localeCompare(b));
  return uniqueSortedKeys;
}

function parseRdateLine(line: string): string[] {
  if (!line.startsWith('RDATE')) return [];
  const [, rawDates = ''] = line.split(':', 2);
  return rawDates
    .split(',')
    .map((value) => value.trim().replaceAll('-', '').slice(0, 8))
    .filter((value) => /^\d{8}$/.test(value));
}

function buildSeriesTimingPatch(
  seriesEvent: GoogleCalendarEvent,
  occurrenceKeys: string[],
): Partial<GoogleCalendarEvent> {
  if (occurrenceKeys.length === 0) {
    throw new Error('Recurring split requires at least one remaining occurrence');
  }

  const [firstKey, ...remainingKeys] = occurrenceKeys;
  return {
    start: buildSeriesStart(seriesEvent, firstKey),
    end: buildSeriesEnd(seriesEvent, firstKey),
    recurrence: chunkRdates(remainingKeys.map((key) => `VALUE=DATE:${key}`)),
  };
}

function buildSeriesEventPayload(
  seriesEvent: GoogleCalendarEvent,
  occurrenceKeys: string[],
  overrides: Partial<GoogleCalendarEvent> = {},
): Partial<GoogleCalendarEvent> {
  if (occurrenceKeys.length === 0) {
    throw new Error('Recurring split requires at least one future occurrence');
  }

  const [firstKey, ...remainingKeys] = occurrenceKeys;
  return {
    summary: overrides.summary ?? seriesEvent.summary,
    description: overrides.description ?? seriesEvent.description,
    start: buildSeriesStart(seriesEvent, firstKey),
    end: buildSeriesEnd(seriesEvent, firstKey),
    recurrence: chunkRdates(remainingKeys.map((key) => `VALUE=DATE:${key}`)),
    extendedProperties: seriesEvent.extendedProperties,
  };
}

function buildSeriesStart(
  seriesEvent: GoogleCalendarEvent,
  occurrenceKey: string,
): GoogleCalendarDateTime {
  if (seriesEvent.start?.date) {
    return {
      date: formatDateKeyAsIso(occurrenceKey),
    };
  }

  if (seriesEvent.start?.dateTime) {
    return {
      dateTime: replaceDatePart(seriesEvent.start.dateTime, occurrenceKey),
      timeZone: seriesEvent.start.timeZone,
    };
  }

  throw new Error('Recurring event is missing a start time');
}

function buildSeriesEnd(
  seriesEvent: GoogleCalendarEvent,
  occurrenceKey: string,
): GoogleCalendarDateTime {
  if (seriesEvent.end?.date) {
    return {
      date: formatDateKeyAsIso(occurrenceKey),
    };
  }

  if (seriesEvent.end?.dateTime) {
    return {
      dateTime: replaceDatePart(seriesEvent.end.dateTime, occurrenceKey),
      timeZone: seriesEvent.end.timeZone,
    };
  }

  return buildSeriesStart(seriesEvent, occurrenceKey);
}

function formatDateKeyAsIso(dateKey: string): string {
  return `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`;
}

function replaceDatePart(dateTime: string, dateKey: string): string {
  return `${formatDateKeyAsIso(dateKey)}${dateTime.slice(10)}`;
}
