import { getSessionTokenFromRequest, requireSession, verifyCsrf } from '../../_lib/auth.js';
import { authorizedGoogleFetch, googleApiErrorResponse } from '../../_lib/google-calendar.js';
import { json } from '../../_lib/response.js';

function normalizeSearchValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getEventSortValue(event) {
  const startValue = event?.start?.dateTime || event?.start?.date || '';
  if (!startValue) {
    return Number.POSITIVE_INFINITY;
  }

  if (event?.start?.date) {
    const parsed = Date.parse(`${startValue}T12:00:00`);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
  }

  const parsed = Date.parse(startValue);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function matchesClientSideFilters(event, locationQuery, excludeQuery) {
  const haystacks = [
    event?.summary || '',
    event?.description || '',
    event?.location || '',
  ]
    .join(' ')
    .toLowerCase();

  if (locationQuery) {
    const locationValue = String(event?.location || '').toLowerCase();
    if (!locationValue.includes(locationQuery)) {
      return false;
    }
  }

  if (excludeQuery && haystacks.includes(excludeQuery)) {
    return false;
  }

  return true;
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
    const calendarIds = Array.isArray(body?.calendarIds) ? body.calendarIds : [];
    const query = normalizeSearchValue(body?.query);
    const timeMin = normalizeSearchValue(body?.timeMin);
    const timeMax = normalizeSearchValue(body?.timeMax);
    const locationQuery = normalizeSearchValue(body?.location).toLowerCase();
    const excludeQuery = normalizeSearchValue(body?.exclude).toLowerCase();

    if (calendarIds.length === 0) {
      return json({ items: [] });
    }

    const results = await Promise.all(
      calendarIds.map(async (calendarId) => {
        const url = new URL(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        );
        url.searchParams.append('singleEvents', 'true');
        url.searchParams.append('orderBy', 'startTime');
        url.searchParams.append('showDeleted', 'false');
        url.searchParams.append('maxResults', '250');

        if (query) {
          url.searchParams.append('q', query);
        }
        if (timeMin) {
          url.searchParams.append('timeMin', timeMin);
        }
        if (timeMax) {
          url.searchParams.append('timeMax', timeMax);
        }

        const response = await authorizedGoogleFetch(
          session,
          url.toString(),
          {},
          'Failed to search calendar events',
        );
        const data = await response.json();
        return (data.items || [])
          .filter((event) => matchesClientSideFilters(event, locationQuery, excludeQuery))
          .map((event) => ({ ...event, calendarId }));
      }),
    );

    const sortedItems = results
      .flat()
      .sort((a, b) => getEventSortValue(a) - getEventSortValue(b));

    return json({ items: sortedItems });
  } catch (error) {
    console.error('Failed to search calendar events:', error);
    return googleApiErrorResponse(error, 'Failed to search calendar events');
  }
}
