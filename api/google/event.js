import { getSessionTokenFromRequest, requireSession, verifyCsrf } from '../_lib/auth.js';
import { authorizedGoogleFetch, googleApiErrorResponse } from '../_lib/google-calendar.js';
import { json } from '../_lib/response.js';
import { withRequestLogging } from '../_lib/observability.js';

function getEventUrl(calendarId, eventId) {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
}

async function getEvent(request) {
  const sessionToken = getSessionTokenFromRequest(request);
  const session = sessionToken ? await requireSession(request) : null;
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const calendarId = url.searchParams.get('calendarId');
    const eventId = url.searchParams.get('eventId');

    if (!calendarId || !eventId) {
      return json({ error: 'calendarId and eventId are required' }, { status: 400 });
    }

    const response = await authorizedGoogleFetch(
      session,
      getEventUrl(calendarId, eventId),
      {},
      'Failed to fetch event',
    );

    return json(await response.json());
  } catch (error) {
    return googleApiErrorResponse(error, 'Failed to fetch event');
  }
}

async function updateEvent(request) {
  const sessionToken = getSessionTokenFromRequest(request);
  const session = sessionToken ? await requireSession(request) : null;
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!verifyCsrf(request, sessionToken)) {
    return json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const calendarId = url.searchParams.get('calendarId');
    const eventId = url.searchParams.get('eventId');
    const updates = await request.json();

    if (!calendarId || !eventId) {
      return json({ error: 'calendarId and eventId are required' }, { status: 400 });
    }

    const response = await authorizedGoogleFetch(
      session,
      getEventUrl(calendarId, eventId),
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      },
      'Failed to update event',
    );

    return json(await response.json());
  } catch (error) {
    return googleApiErrorResponse(error, 'Failed to update event');
  }
}

async function deleteEvent(request) {
  const sessionToken = getSessionTokenFromRequest(request);
  const session = sessionToken ? await requireSession(request) : null;
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!verifyCsrf(request, sessionToken)) {
    return json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const calendarId = url.searchParams.get('calendarId');
    const eventId = url.searchParams.get('eventId');

    if (!calendarId || !eventId) {
      return json({ error: 'calendarId and eventId are required' }, { status: 400 });
    }

    await authorizedGoogleFetch(
      session,
      getEventUrl(calendarId, eventId),
      {
        method: 'DELETE',
      },
      'Failed to delete event',
    );

    return json({ success: true });
  } catch (error) {
    return googleApiErrorResponse(error, 'Failed to delete event');
  }
}

export const GET = withRequestLogging('/api/google/event', getEvent);
export const PATCH = withRequestLogging('/api/google/event', updateEvent);
export const DELETE = withRequestLogging('/api/google/event', deleteEvent);
