import { HDate, gematriya } from '@hebcal/core';
import {
  getHolidayDetails,
  getShabbatParshaDetail,
  HEBREW_MONTHS,
  formatHebrewYear,
} from './hebcal';
import type {
  CalendarDay,
  GoogleCalendarEvent,
  HebrewMonthGregorianRange,
  HebrewMonthMeta,
  OverflowDay,
  OverflowPopoverLayout,
} from '../types/appTypes';

interface ScheduleDayDisplayOptions {
  showFasts: boolean;
  showHolidayEvents: boolean;
  showNationalHolidays: boolean;
  showRoshChodesh: boolean;
  showWeeklyParsha: boolean;
}

function parseEventStart(event: GoogleCalendarEvent): Date | null {
  const startValue = event.start?.dateTime || event.start?.date;
  if (!startValue) return null;

  const parsedDate = event.start?.dateTime
    ? new Date(startValue)
    : new Date(`${startValue}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function parseEventEnd(event: GoogleCalendarEvent, startDate: Date): Date | null {
  const endValue = event.end?.dateTime || event.end?.date;

  if (!endValue) {
    if (event.start?.date) {
      const fallbackEnd = new Date(startDate);
      fallbackEnd.setDate(fallbackEnd.getDate() + 1);
      return fallbackEnd;
    }

    return new Date(startDate.getTime() + 1);
  }

  const parsedDate = event.end?.dateTime
    ? new Date(endValue)
    : new Date(`${endValue}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function eventOccursOnDay(event: GoogleCalendarEvent, dayDate: Date): boolean {
  const eventStart = parseEventStart(event);
  if (!eventStart) return false;

  const dayStart = new Date(dayDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const eventEnd = parseEventEnd(event, eventStart);
  if (!eventEnd) return false;

  return eventStart < dayEnd && eventEnd > dayStart;
}

function getSortableEventDate(event: GoogleCalendarEvent): Date | null {
  const eventStart = parseEventStart(event);
  if (!eventStart) return null;

  if (event.start?.dateTime) {
    return eventStart;
  }

  const sortableDate = new Date(eventStart);
  sortableDate.setHours(12, 0, 0, 0);
  return sortableDate;
}

export function compareDayEvents(
  a: GoogleCalendarEvent,
  b: GoogleCalendarEvent,
): number {
  const aIsTimed = Boolean(a.start?.dateTime);
  const bIsTimed = Boolean(b.start?.dateTime);

  if (aIsTimed !== bIsTimed) {
    return aIsTimed ? 1 : -1;
  }

  const aDate = getSortableEventDate(a);
  const bDate = getSortableEventDate(b);

  if (aDate && bDate) {
    const dateDiff = aDate.getTime() - bDate.getTime();
    if (dateDiff !== 0) return dateDiff;
  } else if (aDate || bDate) {
    return aDate ? -1 : 1;
  }

  const aEnd = getSortableEventDate({
    ...a,
    start: a.end,
  });
  const bEnd = getSortableEventDate({
    ...b,
    start: b.end,
  });

  if (aEnd && bEnd) {
    const endDiff = aEnd.getTime() - bEnd.getTime();
    if (endDiff !== 0) return endDiff;
  } else if (aEnd || bEnd) {
    return aEnd ? -1 : 1;
  }

  const summaryDiff = (a.summary || '').localeCompare(b.summary || '', 'he');
  if (summaryDiff !== 0) return summaryDiff;

  return (a.calendarId || '').localeCompare(b.calendarId || '', 'he');
}

export function buildMonthDays(
  viewHDate: HDate,
  calendarEvents: GoogleCalendarEvent[],
): Array<CalendarDay | null> {
  const hMonth = viewHDate.getMonthName();
  const hYear = viewHDate.getFullYear();
  const firstDayH = new HDate(1, hMonth, hYear);
  const daysInMonth = HDate.daysInMonth(HDate.monthFromName(hMonth), hYear);
  const firstDayOfWeek = firstDayH.getDay();
  const days: Array<CalendarDay | null> = [];

  for (let i = 0; i < firstDayOfWeek; i += 1) days.push(null);

  for (let d = 1; d <= daysInMonth; d += 1) {
    const hDate = new HDate(d, hMonth, hYear);
    const gDate = hDate.greg();
    const today = new Date();
    const isToday =
      gDate.getFullYear() === today.getFullYear() &&
      gDate.getMonth() === today.getMonth() &&
      gDate.getDate() === today.getDate();

    const dayEvents = calendarEvents
      .filter((event) => eventOccursOnDay(event, gDate))
      .sort(compareDayEvents);

    days.push({
      hDay: d,
      hDayGematriya: gematriya(d),
      hMonthName: hMonth,
      gDay: gDate.getDate(),
      gMonthLabel: gDate.toLocaleString('he-IL', { month: 'short' }),
      gDate,
      events: dayEvents,
      hYear: hDate.getFullYear(),
      isToday,
      isShabbat: hDate.getDay() === 6,
      weekday: hDate.getDay(),
    });
  }

  return days;
}

export function getHebrewMonthGregorianRange(
  viewHDate: HDate,
): HebrewMonthGregorianRange {
  const hMonth = viewHDate.getMonthName();
  const hYear = viewHDate.getFullYear();
  const firstDay = new HDate(1, hMonth, hYear).greg();
  const lastDay = new HDate(
    HDate.daysInMonth(HDate.monthFromName(hMonth), hYear),
    hMonth,
    hYear,
  ).greg();
  const exclusiveEnd = new Date(lastDay);
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);

  return {
    timeMin: firstDay.toISOString(),
    timeMax: exclusiveEnd.toISOString(),
  };
}

export function getEventOccurrenceHebrewYear(
  event: GoogleCalendarEvent | null | undefined,
): number | null {
  const startValue = event?.start?.dateTime || event?.start?.date;
  if (!startValue) return null;

  const startDate = event?.start?.date
    ? new Date(`${startValue}T12:00:00`)
    : new Date(startValue);

  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  return new HDate(startDate).getFullYear();
}

export function buildScheduleDays(
  days: Array<CalendarDay | null>,
  {
    showFasts,
    showHolidayEvents,
    showNationalHolidays,
    showRoshChodesh,
    showWeeklyParsha,
  }: ScheduleDayDisplayOptions,
): CalendarDay[] {
  return days
    .filter((dayObj): dayObj is CalendarDay => {
      if (!dayObj) {
        return false;
      }

      if (dayObj.events.length > 0) {
        return true;
      }

      const hasHolidayDetails =
        showHolidayEvents || showNationalHolidays || showRoshChodesh || showFasts
          ? getHolidayDetails(dayObj.gDate, {
              includeFasts: showFasts,
              includeHolidayEvents: showHolidayEvents,
              includeNationalHolidays: showNationalHolidays,
              includeRoshChodesh: showRoshChodesh,
            }).length > 0
          : false;

      if (hasHolidayDetails) {
        return true;
      }

      return showWeeklyParsha
        ? Boolean(getShabbatParshaDetail(dayObj.gDate))
        : false;
    })
    .map((dayObj) => ({
      ...dayObj,
      events: [...dayObj.events].sort(compareDayEvents),
    }));
}

export function getHebrewMonthMeta(viewHDate: HDate): HebrewMonthMeta {
  const hMonthNameEnglish = viewHDate.getMonthName();
  const hMonthNameHebrew =
    HEBREW_MONTHS.find((month) => month.id === hMonthNameEnglish)?.label ||
    hMonthNameEnglish;
  const hYear = formatHebrewYear(viewHDate.getFullYear());
  const gMonthRange = `${new HDate(1, hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })} - ${new HDate(HDate.daysInMonth(HDate.monthFromName(hMonthNameEnglish), viewHDate.getFullYear()), hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })}`;

  return {
    hMonthNameEnglish,
    hMonthNameHebrew,
    hYear,
    gMonthRange,
  };
}

export function getNextMonthHDate(viewHDate: HDate): HDate {
  let m = viewHDate.getMonth();
  let y = viewHDate.getFullYear();
  const monthsInYear = HDate.monthsInYear(y);
  if (m === 6) {
    m = 7;
    y += 1;
  } else if (m === monthsInYear) {
    m = 1;
  } else {
    m += 1;
  }
  return new HDate(1, m, y);
}

export function getPrevMonthHDate(viewHDate: HDate): HDate {
  let m = viewHDate.getMonth();
  let y = viewHDate.getFullYear();
  if (m === 7) {
    m = 6;
    y -= 1;
  } else if (m === 1) {
    m = HDate.monthsInYear(y);
  } else {
    m -= 1;
  }
  return new HDate(1, m, y);
}

export function getOverflowPopoverLayout({
  overflowDay,
  viewportWidth,
  viewportHeight,
  overflowPopoverWidth = 220,
  overflowPopoverMargin = 12,
}: {
  overflowDay: OverflowDay | null;
  viewportWidth: number;
  viewportHeight: number;
  overflowPopoverWidth?: number;
  overflowPopoverMargin?: number;
}): OverflowPopoverLayout {
  const overflowAnchorRect = overflowDay?.anchorRect;
  const overflowEventCount = overflowDay?.events?.length ?? 0;
  const overflowPopoverMaxHeight = Math.min(
    viewportHeight - overflowPopoverMargin * 2,
    480,
  );
  const overflowPopoverHeight = Math.min(
    overflowPopoverMaxHeight,
    96 + overflowEventCount * 32,
  );
  const anchorTop = overflowAnchorRect?.top ?? 120;
  const anchorBottom = overflowAnchorRect?.bottom ?? 120;
  const usesMaxPopoverHeight = overflowPopoverHeight >= overflowPopoverMaxHeight - 0.5;
  const fitsBelow = anchorTop + overflowPopoverHeight <= viewportHeight - overflowPopoverMargin;
  const overflowTop = fitsBelow
    ? anchorTop
    : usesMaxPopoverHeight
      ? Math.max(
          overflowPopoverMargin,
          anchorBottom - overflowPopoverHeight,
        )
      : Math.max(
          overflowPopoverMargin,
          Math.min(
            anchorTop,
            viewportHeight - overflowPopoverHeight - overflowPopoverMargin,
          ),
        );
  const overflowLeft = Math.max(
    overflowPopoverMargin,
    Math.min(
      (overflowAnchorRect?.right ?? overflowPopoverWidth + overflowPopoverMargin) -
        overflowPopoverWidth,
      viewportWidth - overflowPopoverWidth - overflowPopoverMargin,
    ),
  );

  return {
    overflowPopoverWidth,
    overflowPopoverMargin,
    overflowPopoverMaxHeight,
    overflowTop,
    overflowLeft,
  };
}
