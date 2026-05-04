import { getSessionTokenFromRequest, requireSession, verifyCsrf } from '../_lib/auth.js';
import { authorizedGoogleFetch, listCalendars } from '../_lib/google-calendar.js';
import { json } from '../_lib/response.js';

const APP_SIGNATURE = 'ID:hebcal-sync-app';

export async function GET(request) {
  const session = await requireSession(request);
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const calendars = await listCalendars(session);
    return json({ items: calendars, scopeMode: session.scope_mode });
  } catch (error) {
    console.error('Failed to load calendars:', error);
    return json({ error: error.message || 'Failed to fetch calendars' }, { status: 500 });
  }
}

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
    console.error('Failed to create calendar:', error);
    return json({ error: error.message || 'Failed to create calendar' }, { status: 500 });
  }
}
