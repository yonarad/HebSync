import { formatHebrewYear } from './hebcal';

export const GCAL_AUTH_EXPIRED_EVENT = 'gcal-auth-expired';

const AUTH_ERROR_CODE = 'AUTH_EXPIRED';
const APP_SIGNATURE = 'ID:hebcal-sync-app';
const SESSION_STORAGE_KEY = 'gcal_session';

function createAuthError(message = 'Google session expired') {
  const error = new Error(message);
  error.code = AUTH_ERROR_CODE;
  return error;
}

function notifyAuthExpired() {
  logout();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GCAL_AUTH_EXPIRED_EVENT));
  }
  return createAuthError();
}

function getStoredSession() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function setStoredSession(session) {
  if (!session) {
    logout();
    return;
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  if (session.scopeMode) {
    localStorage.setItem('gcal_scope_mode', session.scopeMode);
  }
}

function getCsrfToken() {
  return getStoredSession()?.csrfToken || null;
}

export function isAuthError(error) {
  return error?.code === AUTH_ERROR_CODE;
}

async function readGoogleError(response, fallbackMessage) {
  let errorMessage = fallbackMessage;
  let errorCode = null;

  try {
    const errorData = await response.clone().json();
    errorCode = errorData?.code || null;
    errorMessage =
      errorData?.error?.message ||
      errorData?.error ||
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

async function authorizedFetch(url, options = {}, fallbackMessage = 'Google request failed') {
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

export function authenticateWithGoogle(scopeMode, onSuccess, onError) {
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
    window.location.assign(url.toString());
  } catch (error) {
    onError?.(error);
  }
}

export function getAccessToken() {
  return getStoredSession() ? 'server-session' : null;
}

export async function fetchSession() {
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

  const data = await response.json();
  if (data?.authenticated && data?.user) {
    setStoredSession(data.user);
    return data.user;
  }

  logout();
  return null;
}

export function logout() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('gcal_scope_mode');
  localStorage.removeItem('gcal_app_calendar_id');
}

export async function revokeAccess() {
  try {
    await authorizedFetch('/api/auth/logout', { method: 'POST' }, 'Failed to revoke access');
  } catch (error) {
    console.error('Failed to revoke token:', error);
  } finally {
    logout();
  }
}

export async function fetchAllCalendars() {
  const response = await authorizedFetch(
    '/api/google/calendars',
    {},
    'Failed to fetch calendars',
  );
  const data = await response.json();
  const items = data.items || [];

  const mode = data.scopeMode || localStorage.getItem('gcal_scope_mode');
  if (mode === 'app_created') {
    return items.filter(
      (calendar) =>
        calendar.description && calendar.description.includes(APP_SIGNATURE),
    );
  }

  return items;
}

export async function createNewCalendar(summary) {
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

  return await response.json();
}

export async function fetchMyAppEvents(calendarIds = []) {
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
  const data = await response.json();
  return data.items || [];
}

export async function fetchEventsInRange(timeMin, timeMax, calendarIds = []) {
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
  const data = await response.json();
  return data.items || [];
}

export async function createHebcalEvent(
  title,
  category,
  originalHebrewYear,
  rdateString,
  calendarId,
  userDescription = '',
) {
  if (!calendarId) throw new Error('No calendar selected');

  const eventId = crypto.randomUUID();
  const rdates = rdateString.split(',');
  const firstDateStr = rdates[0].replace('VALUE=DATE:', '');
  const remainingRdates = rdates.slice(1);

  const startDateFormatted = `${firstDateStr.substring(0, 4)}-${firstDateStr.substring(4, 6)}-${firstDateStr.substring(6, 8)}`;

  const originalYearNumber = Number(originalHebrewYear);
  const originalHebrewYearLabel = Number.isFinite(originalYearNumber)
    ? `שנת מקור: ${formatHebrewYear(originalYearNumber)} - ${originalHebrewYear}`
    : `שנת מקור: ${originalHebrewYear}`;
  const metadata = `${originalHebrewYearLabel}\nנוצר ע"י "עברי ליומן - HebSync"`;
  const finalDescription = userDescription
    ? `${userDescription}\n\n---\n${metadata}`
    : metadata;

  const eventPayload = {
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

  return await response.json();
}

export async function updateEvent(calendarId, googleEventId, updates) {
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

  return await response.json();
}

export async function deleteEvent(calendarId, googleEventId) {
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

function chunkRdates(rdates) {
  const chunkSize = 80;
  const recurrenceLines = [];

  for (let i = 0; i < rdates.length; i += chunkSize) {
    const chunk = rdates.slice(i, i + chunkSize);
    const cleanChunk = chunk.map((rdate) => rdate.replace('VALUE=DATE:', ''));
    recurrenceLines.push(`RDATE;VALUE=DATE:${cleanChunk.join(',')}`);
  }

  return recurrenceLines;
}
