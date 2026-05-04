import { requireSession } from '../../_lib/auth.js';
import { authorizedGoogleFetch } from '../../_lib/google-calendar.js';
import { json } from '../../_lib/response.js';

export async function POST(request) {
  const session = await requireSession(request);
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const calendarIds = Array.isArray(body?.calendarIds) ? body.calendarIds : [];
    const { timeMin, timeMax } = body || {};

    if (calendarIds.length === 0) {
      return json({ items: [] });
    }

    const results = await Promise.all(
      calendarIds.map(async (calendarId) => {
        const url = new URL(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        );
        url.searchParams.append('timeMin', timeMin);
        url.searchParams.append('timeMax', timeMax);
        url.searchParams.append('singleEvents', 'true');
        url.searchParams.append('orderBy', 'startTime');

        const response = await authorizedGoogleFetch(
          session,
          url.toString(),
          {},
          'Failed to fetch calendar events',
        );
        const data = await response.json();
        return (data.items || []).map((event) => ({ ...event, calendarId }));
      }),
    );

    return json({ items: results.flat() });
  } catch (error) {
    console.error('Failed to fetch events in range:', error);
    return json({ error: error.message || 'Failed to fetch calendar events' }, { status: 500 });
  }
}
