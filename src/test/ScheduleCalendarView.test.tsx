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
            hDayGematriya: 'י״ח',
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
        hMonthNameHebrew="סיוון"
        getEventColor={() => '#1a73e8'}
        handleEventClick={vi.fn()}
        handleHebcalDetailsClick={vi.fn()}
        isCalendarLoading={false}
        handleCreateFromDay={vi.fn()}
        emptyStateMessage=""
      />,
    );

    const dayButton = screen.getByRole('button', {
      name: 'Create event on י״ח (25)',
    });

    expect(within(dayButton).getByText('י״ח')).toBeInTheDocument();
    expect(within(dayButton).queryByText('25')).not.toBeInTheDocument();
  });
});
