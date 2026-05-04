import { getValidGoogleAccessToken } from './google.js';

const APP_SIGNATURE = 'ID:hebcal-sync-app';

async function readGoogleResponse(response, fallbackMessage) {
  let message = fallbackMessage;

  try {
    const payload = await response.clone().json();
    message =
      payload?.error?.message ||
      payload?.error_description ||
      fallbackMessage;
  } catch {
    const text = await response.text().catch(() => '');
    message = text || fallbackMessage;
  }

  throw new Error(message);
}

export async function authorizedGoogleFetch(session, url, options = {}, fallbackMessage = 'Google request failed') {
  const accessToken = await getValidGoogleAccessToken(session.google_connection_id);
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
