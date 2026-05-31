import { describe, expect, it } from 'vitest';
import { HDate } from '@hebcal/core';
import {
  buildMonthDays,
  buildScheduleDays,
  getEventOccurrenceHebrewYear,
  getHebrewMonthGregorianRange,
} from '../utils/calendarView';

describe('getHebrewMonthGregorianRange', () => {
  it('uses an exclusive end that includes the final day of the Hebrew month', () => {
    const viewHDate = new HDate(1, 'Adar I', 5784);
    const range = getHebrewMonthGregorianRange(viewHDate);
    const expectedStart = new HDate(1, 'Adar I', 5784).greg();
    const lastDay = HDate.daysInMonth(HDate.monthFromName('Adar I'), 5784);
    const expectedExclusiveEnd = new HDate(lastDay, 'Adar I', 5784).greg();
    expectedExclusiveEnd.setDate(expectedExclusiveEnd.getDate() + 1);

    expect(new Date(range.timeMin).getTime()).toBe(expectedStart.getTime());
    expect(new Date(range.timeMax).getTime()).toBe(expectedExclusiveEnd.getTime());
  });
});

describe('getEventOccurrenceHebrewYear', () => {
  it('uses the clicked all-day occurrence date instead of the current year', () => {
    const event = {
      start: {
        date: '2027-05-07',
      },
    };

    expect(getEventOccurrenceHebrewYear(event)).toBe(
      new HDate(new Date('2027-05-07T12:00:00')).getFullYear(),
    );
  });

  it('uses timed event instances as-is', () => {
    const event = {
      start: {
        dateTime: '2027-05-07T08:00:00.000Z',
      },
    };

    expect(getEventOccurrenceHebrewYear(event)).toBe(
      new HDate(new Date('2027-05-07T08:00:00.000Z')).getFullYear(),
    );
  });
});

describe('day event sorting', () => {
  it('sorts events inside a day by time before falling back to calendar order', () => {
    const eventDate = new Date('2026-05-18T12:00:00');
    const viewHDate = new HDate(eventDate);
    const calendarEvents = [
      {
        id: 'late-from-a',
        summary: 'Late from A',
        calendarId: 'calendar-a',
        start: {
          dateTime: '2026-05-18T14:00:00.000Z',
        },
        end: {
          dateTime: '2026-05-18T15:00:00.000Z',
        },
      },
      {
        id: 'early-from-b',
        summary: 'Early from B',
        calendarId: 'calendar-b',
        start: {
          dateTime: '2026-05-18T09:00:00.000Z',
        },
        end: {
          dateTime: '2026-05-18T10:00:00.000Z',
        },
      },
      {
        id: 'mid-from-a',
        summary: 'Mid from A',
        calendarId: 'calendar-a',
        start: {
          dateTime: '2026-05-18T11:30:00.000Z',
        },
        end: {
          dateTime: '2026-05-18T12:00:00.000Z',
        },
      },
    ];

    const days = buildMonthDays(viewHDate, calendarEvents);
    const dayWithEvents = days.find(
      (day) =>
        day?.gDate.getFullYear() === eventDate.getFullYear() &&
        day?.gDate.getMonth() === eventDate.getMonth() &&
        day?.gDate.getDate() === eventDate.getDate(),
    );
    const scheduleDays = buildScheduleDays(days, {
      showFasts: false,
      showHolidayEvents: false,
      showNationalHolidays: false,
      showRoshChodesh: false,
      showWeeklyParsha: false,
    });

    expect(dayWithEvents?.events.map((event) => event.id)).toEqual([
      'early-from-b',
      'mid-from-a',
      'late-from-a',
    ]);
    expect(scheduleDays[0].events.map((event) => event.id)).toEqual([
      'early-from-b',
      'mid-from-a',
      'late-from-a',
    ]);
  });

  it('includes days in schedule view when only Hebcal details are visible', () => {
    const viewHDate = new HDate(new Date('2026-09-12T12:00:00Z'));
    const days = buildMonthDays(viewHDate, []);

    const scheduleDays = buildScheduleDays(days, {
      showFasts: false,
      showHolidayEvents: true,
      showNationalHolidays: false,
      showRoshChodesh: false,
      showWeeklyParsha: false,
    });

    expect(
      scheduleDays.some(
        (day) =>
          day.gDate.getFullYear() === 2026 &&
          day.gDate.getMonth() === 8 &&
          day.gDate.getDate() === 12,
      ),
    ).toBe(true);
  });
});
