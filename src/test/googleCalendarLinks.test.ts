import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarSettingsUrl } from '../utils/googleCalendarLinks';

describe('googleCalendarLinks', () => {
  it('builds a Google Calendar settings link with Google encoded calendar id', () => {
    expect(
      buildGoogleCalendarSettingsUrl(
        '87ad2303d9e382a7a664ac5b7f1cdd2c28da11bfc1cd2a4cee75c30ca1075d58@group.calendar.google.com',
      ),
    ).toBe(
      'https://calendar.google.com/calendar/u/0/r/settings/calendar/ODdhZDIzMDNkOWUzODJhN2E2NjRhYzViN2YxY2RkMmMyOGRhMTFiZmMxY2QyYTRjZWU3NWMzMGNhMTA3NWQ1OEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t',
    );
  });
});
