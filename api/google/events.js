import { getSessionTokenFromRequest, requireSession, verifyCsrf } from '../_lib/auth.js';
import { authorizedGoogleFetch, googleApiErrorResponse } from '../_lib/google-calendar.js';
import { json } from '../_lib/response.js';

export async function POST(request) {
  const sessionToken = getSessionTokenFromRequest(request);
  const session = sessionToken ? await requireSession(request) : null;
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!verifyCsrf(request, sessionToken)) {
    return json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { calendarId, eventPayload } = body || {};

    if (!calendarId || !eventPayload) {
      return json({ error: 'calendarId and eventPayload are required' }, { status: 400 });
    }

    const response = await authorizedGoogleFetch(
      session,
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

    return json(await response.json(), { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return googleApiErrorResponse(error, 'Failed to create event');
  }
}
