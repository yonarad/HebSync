import { HDate } from '@hebcal/core';
import { LoaderCircle } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { CalendarDay, GoogleCalendarEvent } from '../types/appTypes';

export function activateOnKeyboard(
  event: KeyboardEvent<HTMLElement>,
  action: () => void,
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

export function formatEventTimeLabel(
  event: GoogleCalendarEvent,
  locale: string,
): string {
  if (!event?.start?.dateTime) return '';
  return new Date(event.start.dateTime).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMobileHebrewDayLabel(label: string): string {
  return label.replace(/['"\u05f3\u05f4]/g, '');
}

export function getMonthDayKey(dayObj: CalendarDay): string {
  return `${dayObj.gDate.getFullYear()}-${String(dayObj.gDate.getMonth() + 1).padStart(2, '0')}-${String(dayObj.gDate.getDate()).padStart(2, '0')}`;
}

export function getEventAgeSuffix(
  event: GoogleCalendarEvent,
  occurrenceHebrewYear: number | null | undefined,
  showEventAges: boolean,
): string {
  if (!showEventAges) return '';

  const props = event.extendedProperties?.private || {};
  const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
  const originalYear = isHebCal ? parseInt(props.originalHebrewYear || '', 10) : null;
  const age =
    originalYear && occurrenceHebrewYear ? occurrenceHebrewYear - originalYear : 0;

  return isHebCal ? ` (${age})` : '';
}

export function getParshaLocale(isRtl: boolean): string {
  return isRtl ? 'he-x-NoNikud' : 'en';
}

export function getHolidayLocale(isRtl: boolean): string {
  return isRtl ? 'he-x-NoNikud' : 'en';
}

export function CalendarLoadingOverlay({ t }: { t: (key: string) => string }) {
  return (
    <div
      data-testid="calendar-loading-state"
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/72 backdrop-blur-[2px] dark:bg-slate-950/68"
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-sm font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/92 dark:text-slate-300">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        <span>{t('loadingGoogleData')}</span>
      </div>
    </div>
  );
}

export function CalendarEmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-3xl border border-dashed border-slate-300 bg-slate-50/90 px-6 py-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <p className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
          {message}
        </p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export const MOBILE_HEBREW_WEEKDAYS = [
  '\u05d0',
  '\u05d1',
  '\u05d2',
  '\u05d3',
  '\u05d4',
  '\u05d5',
  '\u05e9',
];

export function getHebrewDateYear(value: string, isDateTime: boolean): number | null {
  if (!value) return null;
  const date = isDateTime ? new Date(value) : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new HDate(date).getFullYear();
}
