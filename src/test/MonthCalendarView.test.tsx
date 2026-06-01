import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthCalendarView } from '../components/MonthCalendarView';

describe('MonthCalendarView', () => {
  it('keeps the current-day pill compact on mobile so the Gregorian date can stay visible', () => {
    render(
      <MonthCalendarView
        t={(key, options) => {
          if (key === 'createEventOnDay') {
            return `Create event on ${String(options?.hebrewDay ?? '')} (${String(options?.gregorianDay ?? '')})`;
          }

          if (key === 'moreEvents') {
            return `${String(options?.count ?? 0)} more`;
          }

          if (key.startsWith('days.')) {
            return 'יום';
          }

          return key;
        }}
        isRtl
        days={[
          {
            hDay: 11,
            hDayGematriya: 'י״א',
            hMonthName: 'Sivan',
            gDay: 7,
            gMonthLabel: 'יוני',
            gDate: new Date('2026-06-07T12:00:00'),
            events: [],
            hYear: 5786,
            isToday: true,
            isShabbat: false,
            weekday: 0,
          },
        ]}
        showEventAges={false}
        showFasts={false}
        showHolidayEvents={false}
        showNationalHolidays={false}
        showRoshChodesh={false}
        showSpecialShabbat={false}
        showWeeklyParsha={false}
        showGregorian
        isMobileViewport
        maxVisibleMonthEvents={3}
        getEventColor={() => '#1a73e8'}
        handleEventClick={vi.fn()}
        handleHebcalDetailsClick={vi.fn()}
        handleOverflowDayOpen={vi.fn()}
        handleCreateFromDay={vi.fn()}
        isCalendarLoading={false}
        emptyStateMessage=""
      />,
    );

    const todayLabel = screen.getByText('יא');
    expect(todayLabel).toHaveClass('h-5', 'min-w-5', 'text-[10px]');
    expect(screen.getByText('(7)')).toBeInTheDocument();
  });
});
