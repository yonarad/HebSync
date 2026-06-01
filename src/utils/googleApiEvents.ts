import type {
  Calendar,
  CreateHebcalEventOptions,
  GoogleCalendarColors,
  GoogleCalendarEvent,
  EventSearchParams,
} from '../types/appTypes';
import type { GoogleApiListResponse } from './googleApiCore';
import {
  authorizedFetch,
  getScopeMode,
  isHebSyncCalendar,
  SCOPE_MODES,
} from './googleApiCore';
import {
  buildOriginalYearMetadata,
  buildSpecialDateMetadata,
  chunkRdates,
  getCreatedByMetadataLabel,
} from './googleApiSpecialDates';

interface CreateEventPayload {
  summary: string;
  description: string;
  start: {
    date: string;
  };
  end: {
    date: string;
  };
  recurrence: string[];
  extendedProperties: {
    private: {
      appIdentifier: string;
      originalHebrewYear: string;
      eventID: string;
      category: string;
    };
  };
}

export async function fetchAllCalendars(): Promise<Calendar[]> {
  const response = await authorizedFetch(
    '/api/google/calendars',
    {},
    'Failed to fetch calendars',
  );
  const data = (await response.json()) as GoogleApiListResponse<Calendar>;
  const items = data.items || [];

  const mode = data.scopeMode || getScopeMode();
  if (mode === SCOPE_MODES.APP_CREATED) {
    return items.filter(isHebSyncCalendar);
  }

  return items;
}

export async function fetchGoogleCalendarColors(): Promise<GoogleCalendarColors> {
  const response = await authorizedFetch(
    '/api/google/colors',
    {},
    'Failed to fetch Google calendar colors',
  );
  return (await response.json()) as GoogleCalendarColors;
}

export async function createNewCalendar(summary: string): Promise<Calendar> {
  const response = await authorizedFetch(
    '/api/google/calendars',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ summary }),
    },
    'Failed to create calendar',
  );

  return (await response.json()) as Calendar;
}

export async function fetchMyAppEvents(
  calendarIds: string[] = [],
): Promise<GoogleCalendarEvent[]> {
  if (calendarIds.length === 0) return [];

  const response = await authorizedFetch(
    '/api/google/events/app',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ calendarIds }),
    },
    'Failed to fetch events',
  );
  const data = (await response.json()) as GoogleApiListResponse<GoogleCalendarEvent>;
  return data.items || [];
}

export async function fetchEventsInRange(
  timeMin: string,
  timeMax: string,
  calendarIds: string[] = [],
): Promise<GoogleCalendarEvent[]> {
  if (calendarIds.length === 0) return [];

  const response = await authorizedFetch(
    '/api/google/events/in-range',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timeMin, timeMax, calendarIds }),
    },
    'Failed to fetch calendar events',
  );
  const data = (await response.json()) as GoogleApiListResponse<GoogleCalendarEvent>;
  return data.items || [];
}

export async function searchEvents(
  params: EventSearchParams,
): Promise<GoogleCalendarEvent[]> {
  if ((params.calendarIds || []).length === 0) return [];

  const response = await authorizedFetch(
    '/api/google/events/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    },
    'Failed to search calendar events',
  );
  const data = (await response.json()) as GoogleApiListResponse<GoogleCalendarEvent>;
  return data.items || [];
}

export async function createHebcalEvent(
  title: string,
  category: string,
  originalHebrewYear: string | number,
  rdateString: string,
  calendarId: string,
  userDescription = '',
  options: CreateHebcalEventOptions = {},
): Promise<GoogleCalendarEvent> {
  if (!calendarId) throw new Error('No calendar selected');

  const eventId = crypto.randomUUID();
  const rdates = rdateString.split(',');
  const firstDateStr = rdates[0].replace('VALUE=DATE:', '');
  const remainingRdates = rdates.slice(1);

  const startDateFormatted = `${firstDateStr.substring(0, 4)}-${firstDateStr.substring(4, 6)}-${firstDateStr.substring(6, 8)}`;

  const originalHebrewYearLabel = buildOriginalYearMetadata(originalHebrewYear);
  const specialDateMetadata = buildSpecialDateMetadata(options.specialDate);
  const metadataParts = [originalHebrewYearLabel];
  if (specialDateMetadata) {
    metadataParts.push(specialDateMetadata);
  }
  metadataParts.push(getCreatedByMetadataLabel());
  const metadata = metadataParts.join('\n');
  const finalDescription = userDescription
    ? `${userDescription}\n\n---\n${metadata}`
    : metadata;

  const eventPayload: CreateEventPayload = {
    summary: title,
    description: finalDescription,
    start: {
      date: startDateFormatted,
    },
    end: {
      date: startDateFormatted,
    },
    recurrence: remainingRdates.length > 0 ? chunkRdates(remainingRdates) : [],
    extendedProperties: {
      private: {
        appIdentifier: 'MyHebrewCalendar',
        originalHebrewYear: String(originalHebrewYear),
        eventID: eventId,
        category,
      },
    },
  };

  const response = await authorizedFetch(
    '/api/google/events',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calendarId,
        eventPayload,
      }),
    },
    'Failed to create event',
  );

  return (await response.json()) as GoogleCalendarEvent;
}

export async function fetchEvent(
  calendarId: string,
  googleEventId: string,
): Promise<GoogleCalendarEvent> {
  const url = new URL('/api/google/event', window.location.origin);
  url.searchParams.set('calendarId', calendarId);
  url.searchParams.set('eventId', googleEventId);

  const response = await authorizedFetch(
    url.toString(),
    {},
    'Failed to fetch event',
  );

  return (await response.json()) as GoogleCalendarEvent;
}

export async function createGoogleEvent(
  calendarId: string,
  eventPayload: Partial<GoogleCalendarEvent>,
): Promise<GoogleCalendarEvent> {
  const response = await authorizedFetch(
    '/api/google/events',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calendarId,
        eventPayload,
      }),
    },
    'Failed to create event',
  );

  return (await response.json()) as GoogleCalendarEvent;
}

export async function updateEvent(
  calendarId: string,
  googleEventId: string,
  updates: Partial<GoogleCalendarEvent>,
): Promise<GoogleCalendarEvent> {
  const url = new URL('/api/google/event', window.location.origin);
  url.searchParams.set('calendarId', calendarId);
  url.searchParams.set('eventId', googleEventId);

  const response = await authorizedFetch(
    url.toString(),
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    },
    'Failed to update event',
  );

  return (await response.json()) as GoogleCalendarEvent;
}

export async function deleteEvent(
  calendarId: string,
  googleEventId: string,
): Promise<true> {
  const url = new URL('/api/google/event', window.location.origin);
  url.searchParams.set('calendarId', calendarId);
  url.searchParams.set('eventId', googleEventId);

  await authorizedFetch(
    url.toString(),
    {
      method: 'DELETE',
    },
    'Failed to delete event',
  );

  return true;
}
