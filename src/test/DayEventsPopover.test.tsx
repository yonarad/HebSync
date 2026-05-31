import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DayEventsPopover } from '../components/MyCalendarViews';

describe('DayEventsPopover', () => {
  it('shows Hebcal content, uses internal scrolling, and keeps timed events compact', () => {
    const handleHebcalDetailsClick = vi.fn();

    const { container } = render(
      <DayEventsPopover
        overflowDay={{
          hDay: 1,
          hDayGematriya: 'א',
          hMonthName: 'Tishrei',
          gDay: 12,
          gMonthLabel: 'Sep',
          gDate: new Date('2026-09-12T12:00:00Z'),
          events: [
            {
              id: 'all-day-1',
              summary: 'All Day Event',
              start: { date: '2026-09-12' },
              end: { date: '2026-09-13' },
            },
            {
              id: 'timed-1',
              summary: 'Timed Event',
              start: { dateTime: '2026-09-12T08:00:00.000Z' },
              end: { dateTime: '2026-09-12T09:00:00.000Z' },
            },
          ],
          hYear: 5787,
          isToday: false,
          isShabbat: true,
          weekday: 6,
          anchorRect: {
            top: 100,
            left: 100,
            right: 150,
            bottom: 120,
          },
        }}
        isRtl={false}
        closeDayEventsLabel="Close"
        dayEventsDialogLabel="Day events"
        holidayDetailsLabel="Holiday details"
        parshaDetailsLabel="Parsha details"
        overflowPopoverWidth={220}
        overflowPopoverMargin={12}
        overflowPopoverMaxHeight={480}
        overflowTop={40}
        overflowLeft={40}
        showEventAges={false}
        showGregorian
        showFasts={false}
        showHolidayEvents
        showNationalHolidays={false}
        showRoshChodesh
        showSpecialShabbat={false}
        showWeeklyParsha
        getEventColor={(event) => (event.summary === 'All Day Event' ? '#1a73e8' : '#d93025')}
        setOverflowDay={vi.fn()}
        handleOverflowEventClick={vi.fn()}
        handleHebcalDetailsClick={handleHebcalDetailsClick}
      />,
    );

    expect(screen.getByRole('button', { name: /rosh hashana/i })).toBeInTheDocument();

    const timedEvent = screen.getByRole('button', { name: /Timed Event/ });
    expect(timedEvent).not.toHaveStyle({ backgroundColor: 'rgb(217, 48, 37)' });
    expect(within(timedEvent).getByText(/\d{1,2}:\d{2}\s?[AP]M/)).toBeInTheDocument();

    const scrollRegion = container.querySelector('.overflow-y-auto');
    expect(scrollRegion).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /rosh hashana/i }));
    expect(handleHebcalDetailsClick).toHaveBeenCalledWith(
      'Holiday details',
      expect.any(Array),
    );
  });
});
