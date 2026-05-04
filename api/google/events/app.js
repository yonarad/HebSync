import { getSessionTokenFromRequest, requireSession, verifyCsrf } from '../../_lib/auth.js';
import { authorizedGoogleFetch } from '../../_lib/google-calendar.js';
import { json } from '../../_lib/response.js';

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
    const calendarIds = Array.isArray(body?.calendarIds) ? body.calendarIds : [];

    if (calendarIds.length === 0) {
      return json({ items: [] });
    }

    const results = await Promise.all(
      calendarIds.map(async (calendarId) => {
        const url = new URL(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        );
        url.searchParams.append('privateExtendedProperty', 'appIdentifier=MyHebrewCalendar');
        url.searchParams.append('maxResults', '100');
        url.searchParams.append('showDeleted', 'false');

        const response = await authorizedGoogleFetch(
          session,
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
      }),
    );

    return json({ items: results.flat() });
  } catch (error) {
    console.error('Failed to fetch app events:', error);
    return json({ error: error.message || 'Failed to fetch events' }, { status: 500 });
  }
}
