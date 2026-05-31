import type { Page } from '@playwright/test';

const FIXED_NOW = '2026-06-18T12:00:00+03:00';

const calendars = [
  {
    id: 'cal1',
    summary: 'HebSync',
    accessRole: 'owner',
    backgroundColor: '#1a73e8',
    foregroundColor: '#ffffff',
    colorId: '1',
    description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
  },
];

const events = [
  timedEvent('evt-1', 'שחרית', '2026-06-17T06:00:00+03:00', '2026-06-17T06:45:00+03:00'),
  timedEvent('evt-2', 'מתנה הגדולה?', '2026-06-17T13:30:00+03:00', '2026-06-17T14:00:00+03:00'),
  timedEvent('evt-3', 'נוה - תלמוד תורה', '2026-06-17T16:00:00+03:00', '2026-06-17T16:30:00+03:00'),
  timedEvent('evt-4', 'נוה - שיעור בבונאקריד', '2026-06-17T17:30:00+03:00', '2026-06-17T18:00:00+03:00'),
  timedEvent('evt-5', 'איתן ונאבי - התרחנות', '2026-06-17T20:00:00+03:00', '2026-06-17T20:30:00+03:00'),
  timedEvent('evt-6', 'איתן - בית מדרש ערב', '2026-06-17T20:30:00+03:00', '2026-06-17T21:00:00+03:00'),

  allDayEvent('evt-7', 'כלאיים - תלית יומי', '2026-06-18'),
  timedEvent('evt-8', 'יום הולדת עמיחי אור אחד', '2026-06-18T00:00:00+03:00', '2026-06-18T00:30:00+03:00', true),
  timedEvent('evt-9', 'שחרית', '2026-06-18T06:00:00+03:00', '2026-06-18T06:45:00+03:00'),
  timedEvent('evt-10', 'מתנה הגדולה?', '2026-06-18T13:30:00+03:00', '2026-06-18T14:00:00+03:00'),
  timedEvent('evt-11', 'נוה - תלמוד תורה', '2026-06-18T15:15:00+03:00', '2026-06-18T15:45:00+03:00'),
  timedEvent('evt-12', 'איתן ונאבי - התרחנות', '2026-06-18T20:00:00+03:00', '2026-06-18T20:30:00+03:00'),

  timedEvent('evt-13', 'שחרית', '2026-06-30T06:00:00+03:00', '2026-06-30T06:45:00+03:00'),
  timedEvent('evt-14', 'פגישה צוות', '2026-06-30T09:30:00+03:00', '2026-06-30T10:00:00+03:00'),
  timedEvent('evt-15', 'מתנה הגדולה?', '2026-06-30T13:30:00+03:00', '2026-06-30T14:00:00+03:00'),
  timedEvent('evt-16', 'נוה - תלמוד תורה', '2026-06-30T16:00:00+03:00', '2026-06-30T16:30:00+03:00'),
  timedEvent('evt-17', 'חוג קריאה', '2026-06-30T17:00:00+03:00', '2026-06-30T17:45:00+03:00'),
  timedEvent('evt-18', 'איתן ונאבי - התרחנות', '2026-06-30T20:00:00+03:00', '2026-06-30T20:30:00+03:00'),
  timedEvent('evt-19', 'איתן - בית מדרש ערב', '2026-06-30T20:30:00+03:00', '2026-06-30T21:00:00+03:00'),
];

function timedEvent(
  id: string,
  summary: string,
  startDateTime: string,
  endDateTime: string,
  allDayBanner = false,
) {
  return {
    id,
    summary,
    calendarId: 'cal1',
    colorId: '1',
    start: allDayBanner ? { date: startDateTime.slice(0, 10) } : { dateTime: startDateTime },
    end: allDayBanner ? { date: endDateTime.slice(0, 10) } : { dateTime: endDateTime },
    extendedProperties: {
      private: {
        appIdentifier: 'MyHebrewCalendar',
        originalHebrewYear: '5780',
      },
    },
  };
}

function allDayEvent(id: string, summary: string, date: string) {
  return {
    id,
    summary,
    calendarId: 'cal1',
    colorId: '1',
    start: { date },
    end: { date },
    extendedProperties: {
      private: {
        appIdentifier: 'MyHebrewCalendar',
        originalHebrewYear: '5780',
      },
    },
  };
}

export async function mockCalendarApi(page: Page) {
  await page.addInitScript(({ fixedNow }) => {
    const fixedTime = new Date(fixedNow).valueOf();
    const OriginalDate = Date;

    class MockDate extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          super(fixedTime);
          return;
        }
        super(...args);
      }

      static now() {
        return fixedTime;
      }
    }

    MockDate.parse = OriginalDate.parse;
    MockDate.UTC = OriginalDate.UTC;
    globalThis.Date = MockDate as DateConstructor;

    window.localStorage.setItem('i18nextLng', 'he');
    window.localStorage.setItem(
      'gcal_auth_state',
      JSON.stringify({ authenticated: true, scopeMode: 'all_events' }),
    );
    window.localStorage.setItem(
      'hebsync.calendar.displayOptions',
      JSON.stringify({
        showGregorian: true,
        showEventAges: true,
        showFasts: true,
        showHolidayEvents: true,
        showNationalHolidays: true,
        showRoshChodesh: true,
        showSpecialShabbat: true,
        showWeeklyParsha: true,
      }),
    );
    window.localStorage.setItem('hebsync.calendar.selectedCalendarIds', JSON.stringify(['cal1']));
  }, { fixedNow: FIXED_NOW });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    if (pathname === '/api/auth/session') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: {
            scopeMode: 'all_events',
            csrfToken: 'visual-test-csrf',
            user: {
              email: 'visual@example.com',
              name: 'Visual Test',
              csrfToken: 'visual-test-csrf',
            },
          },
        }),
      });
      return;
    }

    if (pathname === '/api/google/calendars') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: calendars,
          scopeMode: 'all_events',
        }),
      });
      return;
    }

    if (pathname === '/api/google/colors') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          calendar: {
            '1': {
              background: '#1a73e8',
              foreground: '#ffffff',
            },
          },
          event: {},
        }),
      });
      return;
    }

    if (pathname === '/api/google/events/app' || pathname === '/api/google/events/in-range') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: events,
        }),
      });
      return;
    }

    if (pathname === '/api/google/events/search') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: events.slice(0, 4),
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

export async function openCalendar(page: Page) {
  await mockCalendarApi(page);
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle');
  await page.getByTestId('calendar-surface').waitFor();
}
