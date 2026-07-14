import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleCalendarView } from '../components/MyCalendarViews';

describe('ScheduleCalendarView', () => {
  const scrollIntoViewMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T10:00:00'));
    scrollIntoViewMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the Hebrew day label for today instead of switching to Gregorian', () => {
    render(
      <ScheduleCalendarView
        t={(key, options) => {
          if (key === 'createEventOnDay') {
            return `Create event on ${String(options?.hebrewDay ?? '')} (${String(options?.gregorianDay ?? '')})`;
          }

          if (key.startsWith('days.')) {
            return '\u05d9\u05d5\u05dd';
          }

          return key;
        }}
        isRtl
        showEventAges={false}
        showFasts={false}
        showHolidayEvents={false}
        showNationalHolidays={false}
        showRoshChodesh={false}
        showSpecialShabbat={false}
        showWeeklyParsha={false}
        showGregorian={false}
        scheduleDays={[
          {
            hDay: 18,
            hDayGematriya: '\u05d9"\u05d7',
            hMonthName: 'Sivan',
            gDay: 25,
            gMonthLabel: '\u05de\u05d0\u05d9',
            gDate: new Date('2026-05-25T12:00:00'),
            events: [
              {
                id: 'evt-1',
                summary: '\u05d0\u05d9\u05e8\u05d5\u05e2 \u05d1\u05d3\u05d9\u05e7\u05d4',
                start: {
                  date: '2026-05-25',
                },
                end: {
                  date: '2026-05-26',
                },
              },
            ],
            hYear: 5786,
            isToday: true,
            isShabbat: false,
            weekday: 1,
          },
        ]}
        hMonthNameHebrew="\u05e1\u05d9\u05d5\u05df"
        getEventColor={() => '#1a73e8'}
        handleEventClick={vi.fn()}
        handleHebcalDetailsClick={vi.fn()}
        isCalendarLoading={false}
        handleCreateFromDay={vi.fn()}
        emptyStateMessage=""
      />,
    );

    const dayButton = screen.getByRole('button', {
      name: 'Create event on \u05d9"\u05d7 (25)',
    });

    expect(within(dayButton).getByText('\u05d9"\u05d7')).toBeInTheDocument();
    expect(within(dayButton).queryByText('25')).not.toBeInTheDocument();
  });

  it('scrolls to today when today has content in schedule view', () => {
    render(
      <ScheduleCalendarView
        t={(key, options) => {
          if (key === 'createEventOnDay') {
            return `Create event on ${String(options?.hebrewDay ?? '')} (${String(options?.gregorianDay ?? '')})`;
          }

          if (key.startsWith('days.')) {
            return 'Day';
          }

          return key;
        }}
        isRtl={false}
        showEventAges={false}
        showFasts={false}
        showHolidayEvents={false}
        showNationalHolidays={false}
        showRoshChodesh={false}
        showSpecialShabbat={false}
        showWeeklyParsha={false}
        showGregorian
        scheduleDays={[
          {
            hDay: 17,
            hDayGematriya: '17',
            hMonthName: 'Sivan',
            gDay: 24,
            gMonthLabel: 'May',
            gDate: new Date('2026-05-24T12:00:00'),
            events: [{ summary: 'Yesterday', start: { date: '2026-05-24' }, end: { date: '2026-05-25' } }],
            hYear: 5786,
            isToday: false,
            isShabbat: false,
            weekday: 0,
          },
          {
            hDay: 18,
            hDayGematriya: '18',
            hMonthName: 'Sivan',
            gDay: 25,
            gMonthLabel: 'May',
            gDate: new Date('2026-05-25T12:00:00'),
            events: [{ summary: 'Today', start: { date: '2026-05-25' }, end: { date: '2026-05-26' } }],
            hYear: 5786,
            isToday: true,
            isShabbat: false,
            weekday: 1,
          },
        ]}
        hMonthNameHebrew="Sivan"
        getEventColor={() => '#1a73e8'}
        handleEventClick={vi.fn()}
        handleHebcalDetailsClick={vi.fn()}
        isCalendarLoading={false}
        handleCreateFromDay={vi.fn()}
        emptyStateMessage=""
      />,
    );

    const todaySection = document.querySelector('[data-schedule-date="2026-05-25"]');
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock.mock.instances[0]).toBe(todaySection);
  });

  it('scrolls to the closest day with content when today has no content', () => {
    render(
      <ScheduleCalendarView
        t={(key, options) => {
          if (key === 'createEventOnDay') {
            return `Create event on ${String(options?.hebrewDay ?? '')} (${String(options?.gregorianDay ?? '')})`;
          }

          if (key.startsWith('days.')) {
            return 'Day';
          }

          return key;
        }}
        isRtl={false}
        showEventAges={false}
        showFasts={false}
        showHolidayEvents={false}
        showNationalHolidays={false}
        showRoshChodesh={false}
        showSpecialShabbat={false}
        showWeeklyParsha={false}
        showGregorian
        scheduleDays={[
          {
            hDay: 15,
            hDayGematriya: '15',
            hMonthName: 'Sivan',
            gDay: 22,
            gMonthLabel: 'May',
            gDate: new Date('2026-05-22T12:00:00'),
            events: [{ summary: 'Far', start: { date: '2026-05-22' }, end: { date: '2026-05-23' } }],
            hYear: 5786,
            isToday: false,
            isShabbat: false,
            weekday: 5,
          },
          {
            hDay: 19,
            hDayGematriya: '19',
            hMonthName: 'Sivan',
            gDay: 26,
            gMonthLabel: 'May',
            gDate: new Date('2026-05-26T12:00:00'),
            events: [{ summary: 'Closest', start: { date: '2026-05-26' }, end: { date: '2026-05-27' } }],
            hYear: 5786,
            isToday: false,
            isShabbat: false,
            weekday: 2,
          },
        ]}
        hMonthNameHebrew="Sivan"
        getEventColor={() => '#1a73e8'}
        handleEventClick={vi.fn()}
        handleHebcalDetailsClick={vi.fn()}
        isCalendarLoading={false}
        handleCreateFromDay={vi.fn()}
        emptyStateMessage=""
      />,
    );

    const nearestSection = document.querySelector('[data-schedule-date="2026-05-26"]');
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock.mock.instances[0]).toBe(nearestSection);
  });

  it('renders all-day events as filled chips and timed events as dotted rows', () => {
    render(
      <ScheduleCalendarView
        t={(key, options) => {
          if (key === 'createEventOnDay') {
            return `Create event on ${String(options?.hebrewDay ?? '')} (${String(options?.gregorianDay ?? '')})`;
          }

          if (key.startsWith('days.')) {
            return 'Day';
          }

          return key;
        }}
        isRtl={false}
        showEventAges={false}
        showFasts={false}
        showHolidayEvents={false}
        showNationalHolidays={false}
        showRoshChodesh={false}
        showSpecialShabbat={false}
        showWeeklyParsha={false}
        showGregorian
        scheduleDays={[
          {
            hDay: 18,
            hDayGematriya: '18',
            hMonthName: 'Sivan',
            gDay: 25,
            gMonthLabel: 'May',
            gDate: new Date('2026-05-25T12:00:00'),
            events: [
              {
                id: 'all-day-1',
                summary: 'All Day Event',
                start: {
                  date: '2026-05-25',
                },
                end: {
                  date: '2026-05-26',
                },
              },
              {
                id: 'timed-1',
                summary: 'Timed Event',
                start: {
                  dateTime: '2026-05-25T08:00:00.000Z',
                },
                end: {
                  dateTime: '2026-05-25T09:00:00.000Z',
                },
              },
            ],
            hYear: 5786,
            isToday: false,
            isShabbat: false,
            weekday: 1,
          },
        ]}
        hMonthNameHebrew="Sivan"
        getEventColor={(event) => (event.summary === 'All Day Event' ? '#1a73e8' : '#d93025')}
        handleEventClick={vi.fn()}
        handleHebcalDetailsClick={vi.fn()}
        isCalendarLoading={false}
        handleCreateFromDay={vi.fn()}
        emptyStateMessage=""
      />,
    );

    const allDayEvent = screen.getByRole('button', { name: 'All Day Event' });
    const timedEvent = screen.getByRole('button', { name: /Timed Event/ });

    expect(allDayEvent).toHaveStyle({ backgroundColor: 'rgb(26, 115, 232)' });
    expect(allDayEvent).toHaveClass('text-white');
    expect(timedEvent).toHaveClass('bg-white');
    expect(timedEvent).not.toHaveStyle({ backgroundColor: 'rgb(217, 48, 37)' });
    expect(within(timedEvent).getByText(/\d{1,2}:\d{2}\s?[AP]M - \d{1,2}:\d{2}\s?[AP]M/)).toBeInTheDocument();
  });
});
