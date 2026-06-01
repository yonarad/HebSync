import { HDate, gematriya as hGematriya } from '@hebcal/core';
import type { HebrewMonthOption, SourceDateValidation } from '../types/appTypes';

export const gematriya = hGematriya;

const HEBREW_MONTH_LABELS = {
  tishrei: '\u05ea\u05e9\u05e8\u05d9',
  cheshvan: '\u05d7\u05e9\u05d5\u05d5\u05df',
  kislev: '\u05db\u05e1\u05dc\u05d5',
  tevet: '\u05d8\u05d1\u05ea',
  shvat: '\u05e9\u05d1\u05d8',
  adarI: '\u05d0\u05d3\u05e8 \u05d0\u05f3',
  adarII: '\u05d0\u05d3\u05e8 \u05d1\u05f3',
  adar: '\u05d0\u05d3\u05e8',
  nisan: '\u05e0\u05d9\u05e1\u05df',
  iyyar: '\u05d0\u05d9\u05d9\u05e8',
  sivan: '\u05e1\u05d9\u05d5\u05df',
  tamuz: '\u05ea\u05de\u05d5\u05d6',
  av: '\u05d0\u05d1',
  elul: '\u05d0\u05dc\u05d5\u05dc',
} as const;

export function formatHebrewYear(year: number | string): string {
  const yearNumber = Number(year);
  if (!Number.isFinite(yearNumber) || yearNumber <= 0) {
    return String(year);
  }

  const thousands = Math.floor(yearNumber / 1000);
  const remainder = yearNumber % 1000;

  if (thousands === 0) {
    return hGematriya(yearNumber);
  }

  const thousandsPart = hGematriya(thousands);
  const remainderPart = remainder > 0 ? hGematriya(remainder) : '';
  return `${thousandsPart}${remainderPart}`;
}

export const HEBREW_MONTHS: HebrewMonthOption[] = [
  { id: 'Tishrei', label: HEBREW_MONTH_LABELS.tishrei },
  { id: 'Cheshvan', label: HEBREW_MONTH_LABELS.cheshvan },
  { id: 'Kislev', label: HEBREW_MONTH_LABELS.kislev },
  { id: 'Tevet', label: HEBREW_MONTH_LABELS.tevet },
  { id: "Sh'vat", label: HEBREW_MONTH_LABELS.shvat },
  { id: 'Adar I', label: HEBREW_MONTH_LABELS.adarI },
  { id: 'Adar II', label: HEBREW_MONTH_LABELS.adarII },
  { id: 'Adar', label: HEBREW_MONTH_LABELS.adar },
  { id: 'Nisan', label: HEBREW_MONTH_LABELS.nisan },
  { id: 'Iyyar', label: HEBREW_MONTH_LABELS.iyyar },
  { id: 'Sivan', label: HEBREW_MONTH_LABELS.sivan },
  { id: 'Tamuz', label: HEBREW_MONTH_LABELS.tamuz },
  { id: 'Av', label: HEBREW_MONTH_LABELS.av },
  { id: 'Elul', label: HEBREW_MONTH_LABELS.elul },
];

export const FLEXIBLE_30TH_MONTHS = ['Cheshvan', 'Kislev', 'Adar I'] as const;

export function requires30thFallbackDecision(
  monthName: string,
  day: number | string,
): boolean {
  const dayNumber = Number.parseInt(String(day), 10);
  return (
    dayNumber === 30 &&
    FLEXIBLE_30TH_MONTHS.includes(monthName as (typeof FLEXIBLE_30TH_MONTHS)[number])
  );
}

export function getMonthsForYear(year: number | string): HebrewMonthOption[] {
  const isLeap = HDate.isLeapYear(Number.parseInt(String(year), 10));

  const baseMonths: HebrewMonthOption[] = [
    { id: 'Tishrei', label: HEBREW_MONTH_LABELS.tishrei },
    { id: 'Cheshvan', label: HEBREW_MONTH_LABELS.cheshvan },
    { id: 'Kislev', label: HEBREW_MONTH_LABELS.kislev },
    { id: 'Tevet', label: HEBREW_MONTH_LABELS.tevet },
    { id: "Sh'vat", label: HEBREW_MONTH_LABELS.shvat },
  ];

  const leapMonths: HebrewMonthOption[] = isLeap
    ? [
        { id: 'Adar I', label: HEBREW_MONTH_LABELS.adarI },
        { id: 'Adar II', label: HEBREW_MONTH_LABELS.adarII },
      ]
    : [{ id: 'Adar', label: HEBREW_MONTH_LABELS.adar }];

  const endMonths: HebrewMonthOption[] = [
    { id: 'Nisan', label: HEBREW_MONTH_LABELS.nisan },
    { id: 'Iyyar', label: HEBREW_MONTH_LABELS.iyyar },
    { id: 'Sivan', label: HEBREW_MONTH_LABELS.sivan },
    { id: 'Tamuz', label: HEBREW_MONTH_LABELS.tamuz },
    { id: 'Av', label: HEBREW_MONTH_LABELS.av },
    { id: 'Elul', label: HEBREW_MONTH_LABELS.elul },
  ];

  return [...baseMonths, ...leapMonths, ...endMonths];
}

export function doesHebrewMonthExistInYear(
  year: number | string,
  monthName: string,
): boolean {
  const yearNumber = Number.parseInt(String(year), 10);
  if (!Number.isFinite(yearNumber)) {
    return false;
  }

  return getMonthsForYear(yearNumber).some((month) => month.id === monthName);
}

export function getDaysInHebrewMonth(
  year: number | string,
  monthName: string,
): number {
  try {
    const monthNum = HDate.monthFromName(monthName);
    return HDate.daysInMonth(monthNum, Number(year));
  } catch {
    return 30;
  }
}

export function validateHebrewDateForYear(
  year: number | string,
  monthName: string,
  day: number | string,
): SourceDateValidation {
  const yearNumber = Number.parseInt(String(year), 10);
  const dayNumber = Number.parseInt(String(day), 10);

  if (!Number.isFinite(yearNumber) || yearNumber <= 0) {
    return { isValid: false, reason: 'invalid_year' };
  }

  if (!Number.isFinite(dayNumber) || dayNumber <= 0) {
    return { isValid: false, reason: 'invalid_day' };
  }

  if (!doesHebrewMonthExistInYear(yearNumber, monthName)) {
    return {
      isValid: false,
      reason: 'month_not_in_year',
      isLeapYear: HDate.isLeapYear(yearNumber),
    };
  }

  const maxDay = getDaysInHebrewMonth(yearNumber, monthName);
  const isFlexible30th = requires30thFallbackDecision(monthName, dayNumber);

  if (dayNumber > maxDay) {
    return {
      isValid: false,
      reason: isFlexible30th ? 'missing_flexible_30th' : 'day_out_of_range',
      isLeapYear: HDate.isLeapYear(yearNumber),
      maxDay,
      isFlexible30th,
    };
  }

  return {
    isValid: true,
    reason: 'ok',
    isLeapYear: HDate.isLeapYear(yearNumber),
    maxDay,
    isFlexible30th,
  };
}

export function gregorianToHebrew(date: Date, afterSunset = false): HDate {
  const hdate = new HDate(date);
  return afterSunset ? hdate.next() : hdate;
}
