import type {
  Calendar,
  GoogleCalendarColors,
  GoogleCalendarEvent,
} from '../types/appTypes';

const FALLBACK_CALENDAR_COLORS = [
  '#0038A8',
  '#DC2626',
  '#16A34A',
  '#CA8A04',
  '#9333EA',
  '#C2410C',
  '#0891B2',
  '#BE185D',
  '#4B5563',
  '#7C2D12',
];

export function resolveCalendarColor(
  calendar: Calendar,
  index = 0,
  googleColors: GoogleCalendarColors | null = null,
): string {
  if (calendar?.backgroundColor) return calendar.backgroundColor;
  if (calendar?.color) return calendar.color;

  const mappedGoogleColor =
    googleColors?.calendar?.[calendar?.colorId || '']?.background;
  if (mappedGoogleColor) return mappedGoogleColor;

  return FALLBACK_CALENDAR_COLORS[index % FALLBACK_CALENDAR_COLORS.length];
}

export function resolveEventColor(
  event: GoogleCalendarEvent,
  calendars: Calendar[],
  googleColors: GoogleCalendarColors | null = null,
): string {
  if (event?.backgroundColor) return event.backgroundColor;

  const mappedEventColor = googleColors?.event?.[event?.colorId || '']?.background;
  if (mappedEventColor) return mappedEventColor;

  const calendar = calendars.find((cal) => cal.id === event?.calendarId);
  const calendarIndex = calendar ? calendars.indexOf(calendar) : 0;
  return calendar
    ? resolveCalendarColor(calendar, calendarIndex, googleColors)
    : FALLBACK_CALENDAR_COLORS[0];
}
