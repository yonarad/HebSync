function base64EncodeWithoutPadding(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const hasSecond = index + 1 < bytes.length;
    const hasThird = index + 2 < bytes.length;

    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 0x03) << 4) | (hasSecond ? second >> 4 : 0)];
    if (hasSecond) {
      encoded += alphabet[((second & 0x0f) << 2) | (hasThird ? third >> 6 : 0)];
    }
    if (hasThird) {
      encoded += alphabet[third & 0x3f];
    }
  }

  return encoded;
}

export function buildGoogleCalendarSettingsUrl(calendarId: string): string {
  const encodedCalendarId = base64EncodeWithoutPadding(calendarId);
  return `https://calendar.google.com/calendar/u/0/r/settings/calendar/${encodeURIComponent(encodedCalendarId)}`;
}
