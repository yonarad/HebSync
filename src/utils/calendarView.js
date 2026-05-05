import { HDate, gematriya } from '@hebcal/core';
import { HEBREW_MONTHS, formatHebrewYear } from './hebcal';

export function buildMonthDays(viewHDate, calendarEvents) {
  const hMonth = viewHDate.getMonthName();
  const hYear = viewHDate.getFullYear();
  const firstDayH = new HDate(1, hMonth, hYear);
  const daysInMonth = HDate.daysInMonth(HDate.monthFromName(hMonth), hYear);
  const firstDayOfWeek = firstDayH.getDay();
  const days = [];

  for (let i = 0; i < firstDayOfWeek; i += 1) days.push(null);

  for (let d = 1; d <= daysInMonth; d += 1) {
    const hDate = new HDate(d, hMonth, hYear);
    const gDate = hDate.greg();
    const today = new Date();
    const isToday =
      gDate.getFullYear() === today.getFullYear() &&
      gDate.getMonth() === today.getMonth() &&
      gDate.getDate() === today.getDate();

    const dayEvents = calendarEvents.filter((event) => {
      const start = event.start?.date || event.start?.dateTime;
      if (!start) return false;
      const eDate = new Date(start);
      return (
        eDate.getFullYear() === gDate.getFullYear() &&
        eDate.getMonth() === gDate.getMonth() &&
        eDate.getDate() === gDate.getDate()
      );
    });

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

export function buildScheduleDays(days) {
  return days
    .filter((dayObj) => dayObj?.events?.length)
    .map((dayObj) => ({
      ...dayObj,
      events: [...dayObj.events].sort((a, b) => {
        const aStart = a.start?.dateTime || a.start?.date || '';
        const bStart = b.start?.dateTime || b.start?.date || '';
        return aStart.localeCompare(bStart);
      }),
    }));
}

export function getHebrewMonthMeta(viewHDate) {
  const hMonthNameEnglish = viewHDate.getMonthName();
  const hMonthNameHebrew = HEBREW_MONTHS.find((month) => month.id === hMonthNameEnglish)?.label || hMonthNameEnglish;
  const hYear = formatHebrewYear(viewHDate.getFullYear());
  const gMonthRange = `${new HDate(1, hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })} - ${new HDate(HDate.daysInMonth(HDate.monthFromName(hMonthNameEnglish), viewHDate.getFullYear()), hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })}`;

  return {
    hMonthNameEnglish,
    hMonthNameHebrew,
    hYear,
    gMonthRange,
  };
}

export function getNextMonthHDate(viewHDate) {
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

export function getPrevMonthHDate(viewHDate) {
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
}) {
  const overflowAnchorRect = overflowDay?.anchorRect;
  const overflowEventCount = overflowDay?.events?.length ?? 0;
  const overflowPopoverHeight = Math.min(
    viewportHeight - overflowPopoverMargin * 2,
    56 + overflowEventCount * 44,
  );
  const overflowPreferredTop = (overflowAnchorRect?.bottom ?? 120) + 8;
  const overflowAboveTop = (overflowAnchorRect?.top ?? 120) - overflowPopoverHeight - 8;
  const overflowTop = Math.max(
    overflowPopoverMargin,
    Math.min(
      overflowPreferredTop + overflowPopoverHeight <= viewportHeight - overflowPopoverMargin
        ? overflowPreferredTop
        : overflowAboveTop,
      viewportHeight - overflowPopoverHeight - overflowPopoverMargin,
    ),
  );
  const overflowLeft = Math.max(
    overflowPopoverMargin,
    Math.min(
      (overflowAnchorRect?.right ?? overflowPopoverWidth + overflowPopoverMargin) - overflowPopoverWidth,
      viewportWidth - overflowPopoverWidth - overflowPopoverMargin,
    ),
  );

  return {
    overflowPopoverWidth,
    overflowPopoverMargin,
    overflowTop,
    overflowLeft,
  };
}
