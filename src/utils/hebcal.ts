import {
  HDate,
  ParshaEvent,
  flags,
  getHolidaysOnDate,
  getSedra,
  gematriya as hGematriya,
} from '@hebcal/core';
import type {
  FallbackChoice,
  HebrewMonthOption,
  PreviewOccurrence,
  SourceDateValidation,
} from '../types/appTypes';

export const gematriya = hGematriya;

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
  { id: 'Tishrei', label: 'תשרי' },
  { id: 'Cheshvan', label: 'חשוון' },
  { id: 'Kislev', label: 'כסלו' },
  { id: 'Tevet', label: 'טבת' },
  { id: "Sh'vat", label: 'שבט' },
  { id: 'Adar I', label: 'אדר א׳' },
  { id: 'Adar II', label: 'אדר ב׳' },
  { id: 'Adar', label: 'אדר' },
  { id: 'Nisan', label: 'ניסן' },
  { id: 'Iyyar', label: 'אייר' },
  { id: 'Sivan', label: 'סיוון' },
  { id: 'Tamuz', label: 'תמוז' },
  { id: 'Av', label: 'אב' },
  { id: 'Elul', label: 'אלול' },
];

export const FLEXIBLE_30TH_MONTHS = ['Cheshvan', 'Kislev', 'Adar I'] as const;

export function requires30thFallbackDecision(
  monthName: string,
  day: number | string,
): boolean {
  const dayNumber = Number.parseInt(String(day), 10);
  return dayNumber === 30 && FLEXIBLE_30TH_MONTHS.includes(monthName as (typeof FLEXIBLE_30TH_MONTHS)[number]);
}

export function getMonthsForYear(year: number | string): HebrewMonthOption[] {
  const isLeap = HDate.isLeapYear(Number.parseInt(String(year), 10));

  const baseMonths: HebrewMonthOption[] = [
    { id: 'Tishrei', label: 'תשרי' },
    { id: 'Cheshvan', label: 'חשוון' },
    { id: 'Kislev', label: 'כסלו' },
    { id: 'Tevet', label: 'טבת' },
    { id: "Sh'vat", label: 'שבט' },
  ];

  const leapMonths: HebrewMonthOption[] = isLeap
    ? [
        { id: 'Adar I', label: 'אדר א׳' },
        { id: 'Adar II', label: 'אדר ב׳' },
      ]
    : [{ id: 'Adar', label: 'אדר' }];

  const endMonths: HebrewMonthOption[] = [
    { id: 'Nisan', label: 'ניסן' },
    { id: 'Iyyar', label: 'אייר' },
    { id: 'Sivan', label: 'סיוון' },
    { id: 'Tamuz', label: 'תמוז' },
    { id: 'Av', label: 'אב' },
    { id: 'Elul', label: 'אלול' },
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

interface ShabbatParshaOptions {
  il?: boolean;
  locale?: string;
  includeHolidayReadings?: boolean;
}

interface HolidayLabelOptions {
  il?: boolean;
  includeFasts?: boolean;
  includeHolidayEvents?: boolean;
  includeNationalHolidays?: boolean;
  includeRoshChodesh?: boolean;
  locale?: string;
}

function usesHebrewLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('he');
}

const NATIONAL_HOLIDAY_NAMES = new Set([
  'Yom HaAtzma’ut',
  'Yom Yerushalayim',
  'Sigd',
  'Yom HaShoah',
  'Yom HaZikaron',
]);

function normalizeHebcalDesc(value: string): string {
  return value.replace(/[’']/g, "'");
}

const NORMALIZED_NATIONAL_HOLIDAY_NAMES = new Set(
  [...NATIONAL_HOLIDAY_NAMES, "Yom HaAtzma'ut"].map(normalizeHebcalDesc),
);

const MINOR_HOLIDAY_NAMES = new Set([
  'Tu BiShvat',
  'Purim',
  'Shushan Purim',
  'Pesach Sheni',
  'Lag BaOmer',
  "Tu B'Av",
  'Leil Selichot',
  'Chanukah: 1 Candle',
  'Chanukah: 2 Candles',
  'Chanukah: 3 Candles',
  'Chanukah: 4 Candles',
  'Chanukah: 5 Candles',
  'Chanukah: 6 Candles',
  'Chanukah: 7 Candles',
  'Chanukah: 8 Candles',
  'Chanukah: 8th Day',
]);

const NORMALIZED_MINOR_HOLIDAY_NAMES = new Set(
  [...MINOR_HOLIDAY_NAMES].map(normalizeHebcalDesc),
);

export function getShabbatParshaName(
  date: Date,
  options: ShabbatParshaOptions = {},
): string | null {
  const { il = true, locale = 'he-x-NoNikud', includeHolidayReadings = false } = options;
  const hdate = new HDate(date);

  if (hdate.getDay() !== 6) {
    return null;
  }

  const sedra = getSedra(hdate.getFullYear(), il).lookup(hdate);
  if (sedra.chag && !includeHolidayReadings) {
    return null;
  }

  return new ParshaEvent(sedra).render(locale);
}

export function getHolidayLabels(
  date: Date,
  options: HolidayLabelOptions = {},
): string[] {
  const {
    il = true,
    includeFasts = true,
    includeHolidayEvents = true,
    includeNationalHolidays = true,
    includeRoshChodesh = true,
    locale = 'he-x-NoNikud',
  } = options;
  const holidays = getHolidaysOnDate(date, il) || [];

  return holidays
    .filter((event) => {
      const mask = event.getFlags();
      const desc = normalizeHebcalDesc(event.getDesc());
      const isYomKippurKatan = Boolean(mask & flags.YOM_KIPPUR_KATAN);
      const isNationalHoliday = Boolean(mask & flags.MODERN_HOLIDAY) &&
        NORMALIZED_NATIONAL_HOLIDAY_NAMES.has(desc);
      const isMinorHoliday = Boolean(mask & flags.MINOR_HOLIDAY) &&
        NORMALIZED_MINOR_HOLIDAY_NAMES.has(desc);
      const isHolidayEvent =
        Boolean(mask & (flags.CHAG | flags.CHOL_HAMOED | flags.EREV)) || isMinorHoliday;
      const isRoshChodesh = Boolean(mask & flags.ROSH_CHODESH);
      const isFast =
        !isYomKippurKatan && Boolean(mask & (flags.MAJOR_FAST | flags.MINOR_FAST));

      return (
        (includeHolidayEvents && isHolidayEvent) ||
        (includeNationalHolidays && isNationalHoliday) ||
        (includeRoshChodesh && isRoshChodesh) ||
        (includeFasts && isFast)
      );
    })
    .map((event) => {
      const label = event.render(locale);

      if (!usesHebrewLocale(locale)) {
        return label;
      }

      const match = /^ראש השנה (\d+)$/.exec(label);
      if (!match) {
        return label;
      }

      return `ראש השנה ${formatHebrewYear(match[1])}`;
    });
}

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
      note = 'שנה מעוברת - הועבר לאדר ב׳';
    } else if (!isLeapYear && (monthName === 'Adar I' || monthName === 'Adar II')) {
      targetMonth = 'Adar';
      note = 'שנה פשוטה - הועבר לאדר';
    }

    const monthNum = HDate.monthFromName(targetMonth);
    const daysInMonth = HDate.daysInMonth(monthNum, year);

    let hDateToRender: HDate | null = null;
    if (targetDay === 30 && daysInMonth === 29) {
      if (fallback30th === '29th') {
        targetDay = 29;
        note = 'הוקדם לכ״ט (חודש חסר)';
        hDateToRender = new HDate(targetDay, targetMonth, year);
      } else if (fallback30th === '1st') {
        const tempDate = new HDate(29, targetMonth, year);
        const nextDay = tempDate.next();
        note = 'נדחה ל־א׳ (חודש חסר)';
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
        HEBREW_MONTHS.find((month) => month.id === hDateToRender?.getMonthName())?.label ||
        hDateToRender.getMonthName();

      occurrences.push({
        hebrewYear: hDateToRender.getFullYear(),
        hebrewDate: `${gematriya(hDateToRender.getDate())} ב${monthLabel} ${formatHebrewYear(hDateToRender.getFullYear())}`,
        gregorianDate: hDateToRender.greg().toLocaleDateString('he-IL'),
        note,
      });
    }

    year += 1;
  }

  return occurrences;
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
