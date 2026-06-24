import type { Calendar, GoogleCalendarEvent } from '../types/appTypes';
import { getEventOccurrenceHebrewYear } from '../utils/calendarView';
import { HDate } from '@hebcal/core';
import { HEBREW_MONTHS, formatHebrewYear, gematriya } from '../utils/hebcal';
import {
  CalendarEmptyState,
  CalendarLoadingOverlay,
  getEventAgeSuffix,
} from './calendarViewUtils';

export interface SearchResultsViewProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  isRtl: boolean;
  isSearchLoading: boolean;
  searchResults: GoogleCalendarEvent[];
  showEventAges: boolean;
  showGregorian: boolean;
  getEventColor: (event: GoogleCalendarEvent) => string;
  handleEventClick: (event: GoogleCalendarEvent) => void;
  calendars: Calendar[];
  searchTimeMin?: string;
  searchTimeMax?: string;
  onClearSearch: () => void;
  onExtendSearchBackward: () => void | Promise<void>;
  onExtendSearchForward: () => void | Promise<void>;
}

function formatEventDateLabel(
  value: string,
  locale: string,
  isDateTime: boolean,
): string {
  if (!value) return '';

  if (!isDateTime) {
    const [year, month, day] = value.split('-').map(Number);
    if ([year, month, day].some((part) => Number.isNaN(part))) {
      return value;
    }

    return new Date(year, month - 1, day).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatHebrewEventDateLabel(value: string, isDateTime: boolean): string {
  if (!value) return '';

  const date = isDateTime ? new Date(value) : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const hDate = new HDate(date);
  const monthName =
    HEBREW_MONTHS.find((month) => month.id === hDate.getMonthName())?.label ||
    hDate.getMonthName();

  return `${gematriya(hDate.getDate())} \u05d1${monthName} ${formatHebrewYear(hDate.getFullYear())}`;
}

export function SearchResultsView({
  t,
  isRtl,
  isSearchLoading,
  searchResults,
  showEventAges,
  showGregorian,
  getEventColor,
  handleEventClick,
  calendars,
  searchTimeMin,
  searchTimeMax,
  onClearSearch,
  onExtendSearchBackward,
  onExtendSearchForward,
}: SearchResultsViewProps) {
  const calendarNameById = new Map(
    calendars.map((calendar) => [calendar.id, calendar.summary]),
  );
  const activeSearchRangeLabel =
    searchTimeMin && searchTimeMax
      ? t('searchResultsRange', {
          from: formatHebrewEventDateLabel(searchTimeMin, false),
          to: formatHebrewEventDateLabel(searchTimeMax, false),
        })
      : '';

  return (
    <div
      data-testid="search-results-view"
      className="relative flex-1 overflow-hidden bg-white dark:bg-slate-900"
    >
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800 md:px-5">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            {t('searchResultsTitle')}
          </h3>
          {activeSearchRangeLabel ? (
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {activeSearchRangeLabel}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('searchResultsCount', { count: searchResults.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClearSearch}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t('clearSearch')}
        </button>
      </div>

      <div className="h-full overflow-y-auto px-3 py-3 pb-20 dark:bg-slate-900 md:px-5 md:py-4 md:pb-24">
        <div className={`mb-3 flex ${isRtl ? 'justify-start' : 'justify-end'}`}>
          <button
            data-testid="search-extend-backward"
            type="button"
            onClick={() => void onExtendSearchBackward()}
            disabled={isSearchLoading}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-[#0038A8] hover:text-[#0038A8] disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {t('searchExtendBackward')}
          </button>
        </div>
        {!isSearchLoading && searchResults.length === 0 ? (
          <CalendarEmptyState message={t('noSearchResults')} />
        ) : (
          <div className="space-y-3">
            {searchResults.map((event, idx) => {
              const eventColor = getEventColor(event);
              const startValue = event.start?.dateTime || event.start?.date || '';
              const endValue = event.end?.dateTime || event.end?.date || '';
              const isTimed = Boolean(event.start?.dateTime);
              const occurrenceHebrewYear = getEventOccurrenceHebrewYear(event);
              const ageSuffix = getEventAgeSuffix(
                event,
                occurrenceHebrewYear,
                showEventAges,
              );
              const locale = isRtl ? 'he-IL' : 'en-US';
              const dateLabel = startValue
                ? formatEventDateLabel(startValue, locale, isTimed)
                : t('unknownDate');
              const hebrewDateLabel = startValue
                ? formatHebrewEventDateLabel(startValue, isTimed)
                : '';
              const timeLabel = isTimed
                ? `${new Date(startValue).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}${endValue ? ` - ${new Date(endValue).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}` : ''}`
                : t('allDay');

              return (
                <button
                  key={`${event.id || event.summary}-${idx}`}
                  type="button"
                  onClick={() => handleEventClick(event)}
                  className={`flex w-full items-start gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500 dark:hover:bg-slate-800 ${isRtl ? 'text-right' : 'text-left'}`}
                >
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: eventColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-slate-900 dark:text-slate-50">
                      {(event.summary || t('untitledEvent'))}
                      {ageSuffix}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {hebrewDateLabel ? <span>{hebrewDateLabel}</span> : null}
                      {showGregorian ? <span>{dateLabel}</span> : null}
                      <span>{timeLabel}</span>
                      {event.calendarId ? (
                        <span>{calendarNameById.get(event.calendarId) || event.calendarId}</span>
                      ) : null}
                      {event.location ? <span>{event.location}</span> : null}
                    </div>
                    {event.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                        {event.description}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
            <div className={`flex pt-2 ${isRtl ? 'justify-start' : 'justify-end'}`}>
              <button
                data-testid="search-extend-forward"
                type="button"
                onClick={() => void onExtendSearchForward()}
                disabled={isSearchLoading}
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-[#0038A8] hover:text-[#0038A8] disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {t('searchExtendForward')}
              </button>
            </div>
          </div>
        )}
      </div>
      {isSearchLoading ? <CalendarLoadingOverlay t={t} /> : null}
    </div>
  );
}
