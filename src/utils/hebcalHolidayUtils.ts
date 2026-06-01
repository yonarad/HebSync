import { HDate, ParshaEvent, flags, getHolidaysOnDate, getSedra } from '@hebcal/core';
import type { HebcalDisplayDetail } from '../types/appTypes';
import { formatHebrewYear } from './hebcalDateUtils';

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
  includeSpecialShabbat?: boolean;
  locale?: string;
}

const ROSH_HASHANA_HE = '\u05e8\u05d0\u05e9 \u05d4\u05e9\u05e0\u05d4';

function usesHebrewLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('he');
}

function formatHolidayLabel(label: string, locale: string): string {
  if (!usesHebrewLocale(locale)) {
    return label;
  }

  const match = new RegExp(`^${ROSH_HASHANA_HE} (\\d+)$`).exec(label);
  if (!match) {
    return label;
  }

  return `${ROSH_HASHANA_HE} ${formatHebrewYear(match[1])}`;
}

const NATIONAL_HOLIDAY_NAMES = new Set([
  'Yom HaAtzma\u05d2€™ut',
  'Yom Yerushalayim',
  'Sigd',
  'Yom HaShoah',
  'Yom HaZikaron',
]);

function normalizeHebcalDesc(value: string): string {
  return value.replace(/[\u05d2€™']/g, "'");
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

function shouldIncludeHolidayEvent(
  event: {
    getDesc: () => string;
    getFlags: () => number;
  },
  options: Required<HolidayLabelOptions>,
): boolean {
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
  const isSpecialShabbat = Boolean(mask & flags.SPECIAL_SHABBAT);
  const isFast =
    !isYomKippurKatan && Boolean(mask & (flags.MAJOR_FAST | flags.MINOR_FAST));

  return (
    (options.includeHolidayEvents && isHolidayEvent) ||
    (options.includeNationalHolidays && isNationalHoliday) ||
    (options.includeRoshChodesh && isRoshChodesh) ||
    (options.includeSpecialShabbat && isSpecialShabbat) ||
    (options.includeFasts && isFast)
  );
}

function eventToHebcalDisplayDetail(
  event: {
    getDesc: () => string;
    render: (locale?: string) => string;
    renderBrief: (locale?: string) => string;
    getCategories: () => string[];
    url: () => string | undefined;
    memo?: string;
    getEmoji?: () => string | null;
  },
  locale: string,
): HebcalDisplayDetail {
  return {
    key: normalizeHebcalDesc(event.getDesc()),
    title: formatHolidayLabel(event.render(locale), locale),
    brief: formatHolidayLabel(event.renderBrief(locale), locale),
    categories: event.getCategories(),
    url: event.url(),
    memo: event.memo ?? null,
    emoji: event.getEmoji ? event.getEmoji() : null,
  };
}

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

export function getShabbatParshaDetail(
  date: Date,
  options: ShabbatParshaOptions = {},
): HebcalDisplayDetail | null {
  const { il = true, locale = 'he-x-NoNikud', includeHolidayReadings = false } = options;
  const hdate = new HDate(date);

  if (hdate.getDay() !== 6) {
    return null;
  }

  const sedra = getSedra(hdate.getFullYear(), il).lookup(hdate);
  if (sedra.chag && !includeHolidayReadings) {
    return null;
  }

  const event = new ParshaEvent(sedra);
  return {
    key: normalizeHebcalDesc(event.getDesc()),
    title: event.render(locale),
    brief: event.renderBrief(locale),
    categories: event.getCategories(),
    url: event.url(),
    memo: event.memo ?? null,
    emoji: event.getEmoji(),
  };
}

export function getHolidayDetails(
  date: Date,
  options: HolidayLabelOptions = {},
): HebcalDisplayDetail[] {
  const normalizedOptions: Required<HolidayLabelOptions> = {
    il: options.il ?? true,
    includeFasts: options.includeFasts ?? true,
    includeHolidayEvents: options.includeHolidayEvents ?? true,
    includeNationalHolidays: options.includeNationalHolidays ?? true,
    includeRoshChodesh: options.includeRoshChodesh ?? true,
    includeSpecialShabbat: options.includeSpecialShabbat ?? true,
    locale: options.locale ?? 'he-x-NoNikud',
  };
  const holidays = getHolidaysOnDate(date, normalizedOptions.il) || [];

  return holidays
    .filter((event) => shouldIncludeHolidayEvent(event, normalizedOptions))
    .map((event) => eventToHebcalDisplayDetail(event, normalizedOptions.locale));
}

export function getHolidayLabels(
  date: Date,
  options: HolidayLabelOptions = {},
): string[] {
  return getHolidayDetails(date, options).map((detail) => detail.title);
}
