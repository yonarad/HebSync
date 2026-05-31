import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleCalendarView } from '../components/MyCalendarViews';

describe('ScheduleCalendarView', () => {
  it('keeps the Hebrew day label for today instead of switching to Gregorian', () => {
    render(
      <ScheduleCalendarView
        t={(key, options) => {
          if (key === 'createEventOnDay') {
            return `Create event on ${String(options?.hebrewDay ?? '')} (${String(options?.gregorianDay ?? '')})`;
          }

          if (key.startsWith('days.')) {
            return 'יום';
          }

          return key;
        }}
        isRtl
        showEventAges={false}
        showFasts={false}
        showHolidayEvents={false}
        showNationalHolidays={false}
        showRoshChodesh={false}
        showWeeklyParsha={false}
        showGregorian={false}
        scheduleDays={[
          {
            hDay: 18,
            hDayGematriya: 'י"ח',
            hMonthName: 'Sivan',
            gDay: 25,
            gMonthLabel: 'מאי',
            gDate: new Date('2026-05-25T12:00:00'),
            events: [
              {
                id: 'evt-1',
                summary: 'אירוע בדיקה',
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
        hMonthNameHebrew="סיון"
        getEventColor={() => '#1a73e8'}
        handleEventClick={vi.fn()}
        handleHebcalDetailsClick={vi.fn()}
        isCalendarLoading={false}
        handleCreateFromDay={vi.fn()}
        emptyStateMessage=""
      />,
    );

    const dayButton = screen.getByRole('button', {
      name: 'Create event on י"ח (25)',
    });

    expect(within(dayButton).getByText('י"ח')).toBeInTheDocument();
    expect(within(dayButton).queryByText('25')).not.toBeInTheDocument();
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
