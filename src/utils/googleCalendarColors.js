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

export function resolveCalendarColor(calendar, index = 0, googleColors = null) {
  if (calendar?.backgroundColor) return calendar.backgroundColor;
  if (calendar?.color) return calendar.color;

  const mappedGoogleColor = googleColors?.calendar?.[calendar?.colorId]?.background;
  if (mappedGoogleColor) return mappedGoogleColor;

  return FALLBACK_CALENDAR_COLORS[index % FALLBACK_CALENDAR_COLORS.length];
}
