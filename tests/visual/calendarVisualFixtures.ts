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
  timedEvent('evt-1', '\u05e9\u05d7\u05e8\u05d9\u05ea', '2026-06-17T06:00:00+03:00', '2026-06-17T06:45:00+03:00'),
  timedEvent('evt-2', '\u05de\u05ea\u05e0\u05d4 \u05d4\u05d2\u05d3\u05d5\u05dc\u05d4?', '2026-06-17T13:30:00+03:00', '2026-06-17T14:00:00+03:00'),
  timedEvent('evt-3', '\u05e0\u05d5\u05d4 - \u05ea\u05dc\u05de\u05d5\u05d3 \u05ea\u05d5\u05e8\u05d4', '2026-06-17T16:00:00+03:00', '2026-06-17T16:30:00+03:00'),
  timedEvent('evt-4', '\u05e0\u05d5\u05d4 - \u05e9\u05d9\u05e2\u05d5\u05e8 \u05d1\u05d1\u05d5\u05e0\u05d0\u05e7\u05e8\u05d9\u05d3', '2026-06-17T17:30:00+03:00', '2026-06-17T18:00:00+03:00'),
  timedEvent('evt-5', '\u05d0\u05d9\u05ea\u05df \u05d5\u05e0\u05d0\u05d1\u05d9 - \u05d4\u05ea\u05e8\u05d7\u05e0\u05d5\u05ea', '2026-06-17T20:00:00+03:00', '2026-06-17T20:30:00+03:00'),
  timedEvent('evt-6', '\u05d0\u05d9\u05ea\u05df - \u05d1\u05d9\u05ea \u05de\u05d3\u05e8\u05e9 \u05e2\u05e8\u05d1', '2026-06-17T20:30:00+03:00', '2026-06-17T21:00:00+03:00'),

  allDayEvent('evt-7', '\u05db\u05dc\u05d0\u05d9\u05d9\u05dd - \u05ea\u05dc\u05d9\u05ea \u05d9\u05d5\u05de\u05d9', '2026-06-18'),
  timedEvent('evt-8', '\u05d9\u05d5\u05dd \u05d4\u05d5\u05dc\u05d3\u05ea \u05e2\u05de\u05d9\u05d7\u05d9 \u05d0\u05d5\u05e8 \u05d0\u05d7\u05d3', '2026-06-18T00:00:00+03:00', '2026-06-18T00:30:00+03:00', true),
  timedEvent('evt-9', '\u05e9\u05d7\u05e8\u05d9\u05ea', '2026-06-18T06:00:00+03:00', '2026-06-18T06:45:00+03:00', false, true),
  timedEvent('evt-10', '\u05de\u05ea\u05e0\u05d4 \u05d4\u05d2\u05d3\u05d5\u05dc\u05d4?', '2026-06-18T13:30:00+03:00', '2026-06-18T14:00:00+03:00'),
  timedEvent('evt-11', '\u05e0\u05d5\u05d4 - \u05ea\u05dc\u05de\u05d5\u05d3 \u05ea\u05d5\u05e8\u05d4', '2026-06-18T15:15:00+03:00', '2026-06-18T15:45:00+03:00'),
  timedEvent('evt-12', '\u05d0\u05d9\u05ea\u05df \u05d5\u05e0\u05d0\u05d1\u05d9 - \u05d4\u05ea\u05e8\u05d7\u05e0\u05d5\u05ea', '2026-06-18T20:00:00+03:00', '2026-06-18T20:30:00+03:00'),

  timedEvent('evt-13', '\u05e9\u05d7\u05e8\u05d9\u05ea', '2026-06-30T06:00:00+03:00', '2026-06-30T06:45:00+03:00'),
  timedEvent('evt-14', '\u05e4\u05d2\u05d9\u05e9\u05d4 \u05e6\u05d5\u05d5\u05ea', '2026-06-30T09:30:00+03:00', '2026-06-30T10:00:00+03:00'),
  timedEvent('evt-15', '\u05de\u05ea\u05e0\u05d4 \u05d4\u05d2\u05d3\u05d5\u05dc\u05d4?', '2026-06-30T13:30:00+03:00', '2026-06-30T14:00:00+03:00'),
  timedEvent('evt-16', '\u05e0\u05d5\u05d4 - \u05ea\u05dc\u05de\u05d5\u05d3 \u05ea\u05d5\u05e8\u05d4', '2026-06-30T16:00:00+03:00', '2026-06-30T16:30:00+03:00'),
  timedEvent('evt-17', '\u05d7\u05d5\u05d2 \u05e7\u05e8\u05d9\u05d0\u05d4', '2026-06-30T17:00:00+03:00', '2026-06-30T17:45:00+03:00'),
  timedEvent('evt-18', '\u05d0\u05d9\u05ea\u05df \u05d5\u05e0\u05d0\u05d1\u05d9 - \u05d4\u05ea\u05e8\u05d7\u05e0\u05d5\u05ea', '2026-06-30T20:00:00+03:00', '2026-06-30T20:30:00+03:00'),
  timedEvent('evt-19', '\u05d0\u05d9\u05ea\u05df - \u05d1\u05d9\u05ea \u05de\u05d3\u05e8\u05e9 \u05e2\u05e8\u05d1', '2026-06-30T20:30:00+03:00', '2026-06-30T21:00:00+03:00'),
];

function timedEvent(
  id: string,
  summary: string,
  startDateTime: string,
  endDateTime: string,
  allDayBanner = false,
  recurring = false,
) {
  return {
    id,
    summary,
    calendarId: 'cal1',
    colorId: '1',
    start: allDayBanner ? { date: startDateTime.slice(0, 10) } : { dateTime: startDateTime },
    end: allDayBanner ? { date: endDateTime.slice(0, 10) } : { dateTime: endDateTime },
    ...(recurring
      ? {
          recurringEventId: `${id}-series`,
          recurrence: ['RRULE:FREQ=WEEKLY'],
        }
      : {}),
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

interface CalendarFixtureOptions {
  authenticated?: boolean;
}

export async function mockCalendarApi(page: Page, options: CalendarFixtureOptions = {}) {
  const { authenticated = true } = options;

  await page.addInitScript(({ fixedNow, authenticated: isAuthenticated }) => {
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
    if (isAuthenticated) {
      window.localStorage.setItem(
        'gcal_auth_state',
        JSON.stringify({ authenticated: true, scopeMode: 'all_events' }),
      );
    } else {
      window.localStorage.removeItem('gcal_auth_state');
    }
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
  }, { fixedNow: FIXED_NOW, authenticated });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    if (pathname === '/api/auth/session') {
      if (!authenticated) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authenticated: false,
          }),
        });
        return;
      }

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

export async function openCalendar(page: Page, options: CalendarFixtureOptions = {}) {
  await mockCalendarApi(page, options);
  await page.goto('/calendar');
  await page.getByTestId('calendar-surface').waitFor();
  await page.getByTestId('calendar-main').waitFor();
}
