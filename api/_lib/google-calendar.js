import { json } from './response.js';
import { getValidGoogleAccessToken } from './google.js';

const APP_SIGNATURE = 'ID:hebcal-sync-app';
const AUTH_ERROR_CODE = 'AUTH_EXPIRED';

function createAuthExpiredError(message) {
  const error = new Error(message);
  error.code = AUTH_ERROR_CODE;
  error.status = 401;
  return error;
}

async function readGoogleResponse(response, fallbackMessage) {
  let message;
  let parseError = null;

  try {
    const payload = await response.clone().json();
    message =
      payload?.error?.message ||
      payload?.error_description ||
      fallbackMessage;
  } catch (error) {
    parseError = error;
    const text = await response.text().catch(() => '');
    message = text || fallbackMessage;
  }

  if (response.status === 401 || response.status === 403) {
    throw createAuthExpiredError(message);
  }

  if (parseError instanceof Error) {
    throw new Error(message, { cause: parseError });
  }

  throw new Error(message);
}

export async function authorizedGoogleFetch(session, url, options = {}, fallbackMessage = 'Google request failed') {
  let accessToken;
  try {
    accessToken = await getValidGoogleAccessToken(session.google_connection_id);
  } catch (error) {
    const message = error?.message || fallbackMessage;
    if (
      message.includes('Missing refresh token') ||
      message.includes('invalid_grant') ||
      message.includes('invalid authentication credentials') ||
      message.includes('Token has been expired or revoked')
    ) {
      throw createAuthExpiredError(message);
    }
    throw error;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    await readGoogleResponse(response, fallbackMessage);
  }

  return response;
}

export function googleApiErrorResponse(error, fallbackMessage) {
  if (error?.code === AUTH_ERROR_CODE || error?.status === 401) {
    return json(
      {
        code: AUTH_ERROR_CODE,
        error: error.message || fallbackMessage,
      },
      { status: 401 },
    );
  }

  return json({ error: error?.message || fallbackMessage }, { status: 500 });
}

export async function listCalendars(session) {
  const response = await authorizedGoogleFetch(
    session,
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {},
    'Failed to fetch calendars',
  );
  const data = await response.json();
  const items = data.items || [];

  if (session.scope_mode === 'app_created') {
    return items.filter(
      (calendar) =>
        calendar.description && calendar.description.includes(APP_SIGNATURE),
    );
  }

  return items;
}
