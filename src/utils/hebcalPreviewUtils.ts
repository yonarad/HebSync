import { HDate } from '@hebcal/core';
import type { FallbackChoice, PreviewOccurrence } from '../types/appTypes';
import {
  formatHebrewYear,
  gematriya,
  HEBREW_MONTHS,
} from './hebcalDateUtils';

const NOTE_ADAR_LEAP = '\u05e9\u05e0\u05d4 \u05de\u05e2\u05d5\u05d1\u05e8\u05ea - \u05d4\u05d5\u05e2\u05d1\u05e8 \u05dc\u05d0\u05d3\u05e8 \u05d1\u05f3';
const NOTE_ADAR_NON_LEAP = '\u05e9\u05e0\u05d4 \u05e4\u05e9\u05d5\u05d8\u05d4 - \u05d4\u05d5\u05e2\u05d1\u05e8 \u05dc\u05d0\u05d3\u05e8';
const NOTE_FALLBACK_29TH = '\u05d4\u05d5\u05e7\u05d3\u05dd \u05dc\u05db\u05f4\u05d8 (\u05d7\u05d5\u05d3\u05e9 \u05d7\u05e1\u05e8)';
const NOTE_FALLBACK_1ST = '\u05e0\u05d3\u05d7\u05d4 \u05dc\u05d0\u05f3 (\u05d7\u05d5\u05d3\u05e9 \u05d7\u05e1\u05e8)';
const DATE_PREFIX = '\u05d1';

export function generateRdates(
  startHebrewYear: number,
  monthName: string,
  day: number,
  maxOccurrences = 121,
  fallback30th: FallbackChoice = 'skip',
): string {
  const rdates: string[] = [];
  const currentHebrewYear = new HDate().getFullYear();

  let year = Math.min(startHebrewYear, currentHebrewYear);
  const maxSearchYear = currentHebrewYear + maxOccurrences + 20;

  while (rdates.length < maxOccurrences && year <= maxSearchYear) {
    let targetMonth = monthName;
    let targetDay = day;

    const isLeapYear = HDate.isLeapYear(year);
    if (isLeapYear && monthName === 'Adar') {
      targetMonth = 'Adar II';
    } else if (!isLeapYear && (monthName === 'Adar I' || monthName === 'Adar II')) {
      targetMonth = 'Adar';
    }

    const monthNum = HDate.monthFromName(targetMonth);
    const daysInMonth = HDate.daysInMonth(monthNum, year);

    if (targetDay === 30 && daysInMonth === 29) {
      if (fallback30th === '29th') {
        targetDay = 29;
        tryAddRdate(new HDate(targetDay, targetMonth, year), rdates);
      } else if (fallback30th === '1st') {
        const tempDate = new HDate(29, targetMonth, year);
        const nextDay = tempDate.next();
        tryAddRdate(
          new HDate(nextDay.getDate(), nextDay.getMonthName(), nextDay.getFullYear()),
          rdates,
        );
      }
    } else {
      tryAddRdate(new HDate(targetDay, targetMonth, year), rdates);
    }

    year += 1;
  }

  return rdates.join(',');
}

export function getPreviewDates(
  startHebrewYear: number,
  monthName: string,
  day: number,
  maxOccurrences = 10,
  fallback30th: FallbackChoice = 'skip',
): PreviewOccurrence[] {
  const occurrences: PreviewOccurrence[] = [];

  let year = startHebrewYear;
  const maxSearchYear = year + maxOccurrences + 20;

  while (occurrences.length < maxOccurrences && year <= maxSearchYear) {
    let targetMonth = monthName;
    let targetDay = day;
    let note = '';

    const isLeapYear = HDate.isLeapYear(year);
    if (isLeapYear && monthName === 'Adar') {
      targetMonth = 'Adar II';
      note = NOTE_ADAR_LEAP;
    } else if (!isLeapYear && (monthName === 'Adar I' || monthName === 'Adar II')) {
      targetMonth = 'Adar';
      note = NOTE_ADAR_NON_LEAP;
    }

    const monthNum = HDate.monthFromName(targetMonth);
    const daysInMonth = HDate.daysInMonth(monthNum, year);

    let hDateToRender: HDate | null = null;
    if (targetDay === 30 && daysInMonth === 29) {
      if (fallback30th === '29th') {
        targetDay = 29;
        note = NOTE_FALLBACK_29TH;
        hDateToRender = new HDate(targetDay, targetMonth, year);
      } else if (fallback30th === '1st') {
        const tempDate = new HDate(29, targetMonth, year);
        const nextDay = tempDate.next();
        note = NOTE_FALLBACK_1ST;
        hDateToRender = new HDate(
          nextDay.getDate(),
          nextDay.getMonthName(),
          nextDay.getFullYear(),
        );
      }
    } else {
      try {
        hDateToRender = new HDate(targetDay, targetMonth, year);
      } catch {}
    }

    if (hDateToRender) {
      const monthLabel =
        HEBREW_MONTHS.find((month) => month.id === hDateToRender.getMonthName())?.label ||
        hDateToRender.getMonthName();

      occurrences.push({
        hebrewYear: hDateToRender.getFullYear(),
        hebrewDate: `${gematriya(hDateToRender.getDate())} ${DATE_PREFIX}${monthLabel} ${formatHebrewYear(hDateToRender.getFullYear())}`,
        gregorianDate: hDateToRender.greg().toLocaleDateString('he-IL'),
        note,
      });
    }

    year += 1;
  }

  return occurrences;
}

function tryAddRdate(hDate: HDate, rdates: string[]): void {
  try {
    const formatted = formatToRdateUTC(hDate.greg());
    if (!rdates.includes(formatted)) {
      rdates.push(formatted);
    }
  } catch {}
}

function formatToRdateUTC(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `VALUE=DATE:${yyyy}${mm}${dd}`;
}
