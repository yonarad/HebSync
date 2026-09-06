import { getSessionTokenFromRequest, requireSession, verifyCsrf } from '../_lib/auth.js';
import { authorizedGoogleFetch, googleApiErrorResponse, listCalendars } from '../_lib/google-calendar.js';
import { json } from '../_lib/response.js';
import { withRequestLogging } from '../_lib/observability.js';

const APP_SIGNATURE = 'ID:hebcal-sync-app';

async function getCalendars(request) {
  const session = await requireSession(request);
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const calendars = await listCalendars(session);
    return json({ items: calendars, scopeMode: session.scope_mode });
  } catch (error) {
    return googleApiErrorResponse(error, 'Failed to fetch calendars');
  }
}

async function createCalendar(request) {
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
    const summary = body?.summary?.trim();

    if (!summary) {
      return json({ error: 'Calendar summary is required' }, { status: 400 });
    }

    const response = await authorizedGoogleFetch(
      session,
      'https://www.googleapis.com/calendar/v3/calendars',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          description: `Created by HebCal-Sync. [${APP_SIGNATURE}]`,
        }),
      },
      'Failed to create calendar',
    );

    return json(await response.json(), { status: 201 });
  } catch (error) {
    return googleApiErrorResponse(error, 'Failed to create calendar');
  }
}

export const GET = withRequestLogging('/api/google/calendars', getCalendars);
export const POST = withRequestLogging('/api/google/calendars', createCalendar);
