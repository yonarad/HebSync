import type { GoogleCalendarEvent } from '../types/appTypes';

export type GreetingEventCategory = 'birthday' | 'anniversary' | 'memorial';

export interface GreetingOptions {
  includeName: boolean;
  includeFirstName?: boolean;
  includeLastName?: boolean;
  includeYears: boolean;
}

export interface GreetingNameParts {
  firstName: string | null;
  lastName: string | null;
}

const HEBREW_TITLE_PREFIXES: Record<GreetingEventCategory, string> = {
  birthday: 'יום הולדת',
  anniversary: 'יום נישואין',
  memorial: 'יום זיכרון',
};

export function getGreetingCategory(event: GoogleCalendarEvent): GreetingEventCategory | null {
  const properties = event.extendedProperties?.private;
  if (properties?.appIdentifier !== 'MyHebrewCalendar') return null;

  return properties.category === 'birthday' || properties.category === 'anniversary' || properties.category === 'memorial'
    ? properties.category
    : null;
}

export function getGreetingName(
  title: string | undefined,
  category: GreetingEventCategory,
): string | null {
  const normalizedTitle = title?.trim() || '';
  const prefix = HEBREW_TITLE_PREFIXES[category];

  if (!normalizedTitle.startsWith(prefix)) return null;

  const name = normalizedTitle.slice(prefix.length).trim().replace(/^[-–—:]+\s*/, '');
  return name || null;
}

export function getGreetingNameParts(name: string | null): GreetingNameParts {
  const [firstName, ...lastNameParts] = name?.trim().split(/\s+/) || [];
  return {
    firstName: firstName || null,
    lastName: lastNameParts.join(' ') || null,
  };
}

export function getGreetingYears(event: GoogleCalendarEvent, occurrenceHebrewYear: number | null): number | null {
  const originalYear = Number(event.extendedProperties?.private?.originalHebrewYear);
  if (!Number.isFinite(originalYear) || !occurrenceHebrewYear) return null;

  return occurrenceHebrewYear - originalYear;
}

export function buildHebrewGreeting(
  category: GreetingEventCategory,
  name: string | null,
  years: number | null,
  options: GreetingOptions,
): string {
  const includeName = category === 'birthday'
    ? (Boolean(options.includeFirstName ?? options.includeName) || Boolean(options.includeLastName ?? options.includeName)) && Boolean(name)
    : options.includeName && Boolean(name);
  const includeYears = options.includeYears && years !== null;

  if (category === 'memorial') {
    if (includeName && includeYears) return `🕯️ נר זיכרון ל${name}, במלאת ${years} שנים לפטירה`;
    if (includeName) return `🕯️ נר זיכרון ל${name}`;
    if (includeYears) return `🕯️ נר זיכרון, במלאת ${years} שנים לפטירה`;
    return '🕯️ נר זיכרון';
  }

  if (category === 'birthday') {
    if (includeName && includeYears) return `🎂 מזל טוב ל${name} ליום הולדת ${years}`;
    if (includeName) return `🎂 מזל טוב ל${name} ליום ההולדת`;
    if (includeYears) return `🎂 מזל טוב ליום הולדתך ה-${years}`;
    return '🎂 מזל טוב ליום הולדתך';
  }

  if (includeName && includeYears) return `🥂 מזל טוב ל${name} ליום נישואין ${years}`;
  if (includeName) return `🥂 מזל טוב ל${name} ליום הנישואין`;
  if (includeYears) return `🥂 מזל טוב ליום נישואיכם ה-${years}`;
  return '🥂 מזל טוב ליום נישואיכם';
}

export function buildWhatsAppGreetingUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildMailGreetingUrl(message: string): string {
  return `mailto:?subject=${encodeURIComponent(message)}`;
}
