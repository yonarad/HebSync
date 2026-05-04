import { requireSession } from '../_lib/auth.js';
import { authorizedGoogleFetch } from '../_lib/google-calendar.js';
import { json } from '../_lib/response.js';

function getEventUrl(calendarId, eventId) {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
}

export async function PATCH(request) {
  const session = await requireSession(request);
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
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
    console.error('Failed to update event:', error);
    return json({ error: error.message || 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await requireSession(request);
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
    console.error('Failed to delete event:', error);
    return json({ error: error.message || 'Failed to delete event' }, { status: 500 });
  }
}
