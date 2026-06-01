import type {
  GoogleCalendarDateTime,
  GoogleCalendarEvent,
} from '../types/appTypes';
import {
  createGoogleEvent,
  deleteEvent,
  fetchEvent,
  updateEvent,
} from './googleApiEvents';
import { chunkRdates } from './googleApiSpecialDates';

export type RecurringEventActionScope = 'single' | 'series' | 'future';

export function isRecurringEvent(event: GoogleCalendarEvent | null | undefined): boolean {
  return Boolean(event?.recurringEventId || (event?.recurrence?.length ?? 0) > 0);
}

export function supportsFutureScopedChanges(
  event: GoogleCalendarEvent | null | undefined,
): boolean {
  const appIdentifier = event?.extendedProperties?.private?.appIdentifier;
  return appIdentifier === 'MyHebrewCalendar' && isRecurringEvent(event);
}

export async function updateRecurringEventScope(
  event: GoogleCalendarEvent,
  updates: Partial<GoogleCalendarEvent>,
  scope: RecurringEventActionScope,
): Promise<GoogleCalendarEvent> {
  if (!event.calendarId || !event.id) {
    throw new Error('Missing calendar or event id');
  }

  if (scope === 'single' || !isRecurringEvent(event)) {
    return updateEvent(event.calendarId, event.id, updates);
  }

  const seriesEventId = event.recurringEventId || event.id;
  if (scope === 'series') {
    return updateEvent(event.calendarId, seriesEventId, updates);
  }

  const seriesEvent = await fetchEvent(event.calendarId, seriesEventId);
  const targetOccurrenceKey = getOccurrenceKey(event);
  const seriesOccurrenceKeys = getSeriesOccurrenceKeys(seriesEvent);
  const targetIndex = targetOccurrenceKey
    ? seriesOccurrenceKeys.indexOf(targetOccurrenceKey)
    : -1;

  if (targetIndex <= 0) {
    return updateEvent(event.calendarId, seriesEventId, updates);
  }

  const previousKeys = seriesOccurrenceKeys.slice(0, targetIndex);
  const futureKeys = seriesOccurrenceKeys.slice(targetIndex);

  if (futureKeys.length === 0) {
    return updateEvent(event.calendarId, seriesEventId, updates);
  }

  await updateEvent(
    event.calendarId,
    seriesEventId,
    buildSeriesTimingPatch(seriesEvent, previousKeys),
  );

  const futureSeriesPayload = buildSeriesEventPayload(seriesEvent, futureKeys, updates);
  return createGoogleEvent(event.calendarId, futureSeriesPayload);
}

export async function deleteRecurringEventScope(
  event: GoogleCalendarEvent,
  scope: RecurringEventActionScope,
): Promise<true> {
  if (!event.calendarId || !event.id) {
    throw new Error('Missing calendar or event id');
  }

  if (scope === 'single' || !isRecurringEvent(event)) {
    return deleteEvent(event.calendarId, event.id);
  }

  const seriesEventId = event.recurringEventId || event.id;
  if (scope === 'series') {
    return deleteEvent(event.calendarId, seriesEventId);
  }

  const seriesEvent = await fetchEvent(event.calendarId, seriesEventId);
  const targetOccurrenceKey = getOccurrenceKey(event);
  const seriesOccurrenceKeys = getSeriesOccurrenceKeys(seriesEvent);
  const targetIndex = targetOccurrenceKey
    ? seriesOccurrenceKeys.indexOf(targetOccurrenceKey)
    : -1;

  if (targetIndex <= 0) {
    return deleteEvent(event.calendarId, seriesEventId);
  }

  const previousKeys = seriesOccurrenceKeys.slice(0, targetIndex);
  if (previousKeys.length === 0) {
    return deleteEvent(event.calendarId, seriesEventId);
  }

  await updateEvent(
    event.calendarId,
    seriesEventId,
    buildSeriesTimingPatch(seriesEvent, previousKeys),
  );

  return true;
}

function getOccurrenceKey(event: GoogleCalendarEvent | null | undefined): string | null {
  const dateValue =
    event?.originalStartTime?.date ||
    event?.start?.date ||
    event?.originalStartTime?.dateTime ||
    event?.start?.dateTime;

  if (!dateValue) return null;

  return dateValue.slice(0, 10).replaceAll('-', '');
}

function getSeriesOccurrenceKeys(event: GoogleCalendarEvent): string[] {
  const startKey = getOccurrenceKey(event);
  if (!startKey) {
    throw new Error('Recurring event is missing a start date');
  }

  const recurrenceKeys = (event.recurrence || [])
    .flatMap((line) => parseRdateLine(line))
    .filter(Boolean);

  const allKeys = [startKey, ...recurrenceKeys];
  const uniqueSortedKeys = [...new Set(allKeys)].sort((a, b) => a.localeCompare(b));
  return uniqueSortedKeys;
}

function parseRdateLine(line: string): string[] {
  if (!line.startsWith('RDATE')) return [];
  const [, rawDates = ''] = line.split(':', 2);
  return rawDates
    .split(',')
    .map((value) => value.trim().replaceAll('-', '').slice(0, 8))
    .filter((value) => /^\d{8}$/.test(value));
}

function buildSeriesTimingPatch(
  seriesEvent: GoogleCalendarEvent,
  occurrenceKeys: string[],
): Partial<GoogleCalendarEvent> {
  if (occurrenceKeys.length === 0) {
    throw new Error('Recurring split requires at least one remaining occurrence');
  }

  const [firstKey, ...remainingKeys] = occurrenceKeys;
  return {
    start: buildSeriesStart(seriesEvent, firstKey),
    end: buildSeriesEnd(seriesEvent, firstKey),
    recurrence: chunkRdates(remainingKeys.map((key) => `VALUE=DATE:${key}`)),
  };
}

function buildSeriesEventPayload(
  seriesEvent: GoogleCalendarEvent,
  occurrenceKeys: string[],
  overrides: Partial<GoogleCalendarEvent> = {},
): Partial<GoogleCalendarEvent> {
  if (occurrenceKeys.length === 0) {
    throw new Error('Recurring split requires at least one future occurrence');
  }

  const [firstKey, ...remainingKeys] = occurrenceKeys;
  return {
    summary: overrides.summary ?? seriesEvent.summary,
    description: overrides.description ?? seriesEvent.description,
    start: buildSeriesStart(seriesEvent, firstKey),
    end: buildSeriesEnd(seriesEvent, firstKey),
    recurrence: chunkRdates(remainingKeys.map((key) => `VALUE=DATE:${key}`)),
    extendedProperties: seriesEvent.extendedProperties,
  };
}

function buildSeriesStart(
  seriesEvent: GoogleCalendarEvent,
  occurrenceKey: string,
): GoogleCalendarDateTime {
  if (seriesEvent.start?.date) {
    return {
      date: formatDateKeyAsIso(occurrenceKey),
    };
  }

  if (seriesEvent.start?.dateTime) {
    return {
      dateTime: replaceDatePart(seriesEvent.start.dateTime, occurrenceKey),
      timeZone: seriesEvent.start.timeZone,
    };
  }

  throw new Error('Recurring event is missing a start time');
}

function buildSeriesEnd(
  seriesEvent: GoogleCalendarEvent,
  occurrenceKey: string,
): GoogleCalendarDateTime {
  if (seriesEvent.end?.date) {
    return {
      date: formatDateKeyAsIso(occurrenceKey),
    };
  }

  if (seriesEvent.end?.dateTime) {
    return {
      dateTime: replaceDatePart(seriesEvent.end.dateTime, occurrenceKey),
      timeZone: seriesEvent.end.timeZone,
    };
  }

  return buildSeriesStart(seriesEvent, occurrenceKey);
}

function formatDateKeyAsIso(dateKey: string): string {
  return `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`;
}

function replaceDatePart(dateTime: string, dateKey: string): string {
  return `${formatDateKeyAsIso(dateKey)}${dateTime.slice(10)}`;
}
