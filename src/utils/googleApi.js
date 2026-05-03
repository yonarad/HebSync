import { formatHebrewYear } from './hebcal';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const GCAL_AUTH_EXPIRED_EVENT = 'gcal-auth-expired';

const AUTH_ERROR_CODE = 'AUTH_EXPIRED';
const APP_SIGNATURE = 'ID:hebcal-sync-app';

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

export function isAuthError(error) {
  return error?.code === AUTH_ERROR_CODE;
}

async function readGoogleError(response, fallbackMessage) {
  let errorMessage = fallbackMessage;

  try {
    const errorData = await response.clone().json();
    errorMessage =
      errorData?.error?.message ||
      errorData?.error_description ||
      fallbackMessage;
  } catch {
    const text = await response.text().catch(() => '');
    errorMessage = text || fallbackMessage;
  }

  if (response.status === 401 || response.status === 403) {
    throw notifyAuthExpired();
  }

  throw new Error(errorMessage);
}

async function authorizedFetch(url, options = {}, fallbackMessage = 'Google request failed') {
  const token = getAccessToken();
  if (!token) throw createAuthError('Not authenticated');

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    await readGoogleError(response, fallbackMessage);
  }

  return response;
}

export function authenticateWithGoogle(scopeMode, onSuccess, onError) {
  if (!window.google) {
    onError(new Error('Google Identity Services not loaded'));
    return;
  }

  let scope = '';
  if (scopeMode === 'all_events') {
    scope =
      'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
  } else if (scopeMode === 'read_only') {
    scope = 'https://www.googleapis.com/auth/calendar.readonly';
  } else if (scopeMode === 'app_created') {
    scope =
      'https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/calendar.calendarlist.readonly';
  }

  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope,
    callback: (response) => {
      if (response.error) {
        onError(response);
      } else {
        sessionStorage.setItem('gcal_token', response.access_token);
        sessionStorage.setItem('gcal_scope_mode', scopeMode);
        onSuccess(response.access_token);
      }
    },
  });

  client.requestAccessToken();
}

export function getAccessToken() {
  return sessionStorage.getItem('gcal_token');
}

export function logout() {
  sessionStorage.removeItem('gcal_token');
  sessionStorage.removeItem('gcal_scope_mode');
  sessionStorage.removeItem('gcal_app_calendar_id');
}

export async function revokeAccess() {
  const token = getAccessToken();
  if (!token) return;

  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (error) {
    console.error('Failed to revoke token:', error);
  } finally {
    logout();
  }
}

export async function fetchAllCalendars() {
  const response = await authorizedFetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {},
    'Failed to fetch calendars',
  );
  const data = await response.json();
  const items = data.items || [];

  const mode = sessionStorage.getItem('gcal_scope_mode');
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
    'https://www.googleapis.com/calendar/v3/calendars',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description:
          'Created by HebCal-Sync. [' + APP_SIGNATURE + ']',
      }),
    },
    'Failed to create calendar',
  );

  return await response.json();
}

export async function fetchMyAppEvents(calendarIds = []) {
  if (calendarIds.length === 0) return [];

  const promises = calendarIds.map(async (calendarId) => {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    url.searchParams.append(
      'privateExtendedProperty',
      'appIdentifier=MyHebrewCalendar',
    );
    url.searchParams.append('maxResults', '100');
    url.searchParams.append('showDeleted', 'false');

    const response = await authorizedFetch(
      url.toString(),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
      'Failed to fetch events',
    );

    const data = await response.json();
    return (data.items || []).map((event) => ({ ...event, calendarId }));
  });

  const results = await Promise.all(promises);
  return results.flat();
}

export async function fetchEventsInRange(timeMin, timeMax, calendarIds = []) {
  if (calendarIds.length === 0) return [];

  const promises = calendarIds.map(async (calendarId) => {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    url.searchParams.append('timeMin', timeMin);
    url.searchParams.append('timeMax', timeMax);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');

    const response = await authorizedFetch(
      url.toString(),
      {},
      'Failed to fetch calendar events',
    );

    const data = await response.json();
    return (data.items || []).map((event) => ({ ...event, calendarId }));
  });

  const results = await Promise.all(promises);
  return results.flat();
}

export async function createHebcalEvent(
  title,
  category,
  originalHebrewYear,
  rdateString,
  calendarId,
  userDescription = '',
) {
  if (!getAccessToken()) throw createAuthError('Not authenticated');
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
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    },
    'Failed to create event',
  );

  return await response.json();
}

export async function updateEvent(calendarId, googleEventId, updates) {
  const response = await authorizedFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
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
  await authorizedFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
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
