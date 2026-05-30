import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight, LoaderCircle, Search, X } from 'lucide-react';
import { HDate } from '@hebcal/core';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  HEBREW_MONTHS,
  formatHebrewYear,
  gematriya,
  getHolidayLabels,
  getShabbatParshaName,
} from '../utils/hebcal';
import { getEventOccurrenceHebrewYear } from '../utils/calendarView';
import type {
  Calendar,
  CalendarDay,
  CalendarViewMode,
  EventSearchParams,
  GoogleCalendarEvent,
  OverflowDay,
} from '../types/appTypes';

function activateOnKeyboard(
  event: KeyboardEvent<HTMLElement>,
  action: () => void,
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

function hexToRgba(hex: string | undefined, alpha: number): string {
  if (!hex) return `rgba(0, 56, 168, ${alpha})`;
  const normalized = hex.replace('#', '');
  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  const red = Number.parseInt(fullHex.slice(0, 2), 16);
  const green = Number.parseInt(fullHex.slice(2, 4), 16);
  const blue = Number.parseInt(fullHex.slice(4, 6), 16);

  if ([red, green, blue].some((value) => Number.isNaN(value))) {
    return `rgba(0, 56, 168, ${alpha})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatEventTimeLabel(
  event: GoogleCalendarEvent,
  locale: string,
): string {
  if (!event?.start?.dateTime) return '';
  return new Date(event.start.dateTime).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
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

  return `${gematriya(hDate.getDate())} ב${monthName} ${formatHebrewYear(hDate.getFullYear())}`;
}

function formatMobileHebrewDayLabel(label: string): string {
  return label.replace(/['"׳״]/g, '');
}

function getEventAgeSuffix(
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

function getParshaLocale(isRtl: boolean): string {
  return isRtl ? 'he-x-NoNikud' : 'en';
}

function getHolidayLocale(isRtl: boolean): string {
  return isRtl ? 'he-x-NoNikud' : 'en';
}

function CalendarLoadingOverlay({ t }: { t: (key: string) => string }) {
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

function CalendarEmptyState({
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

interface SharedSearchProps {
  isRtl: boolean;
  t: (key: string) => string;
  searchFilters: EventSearchParams;
  setSearchFilters: React.Dispatch<React.SetStateAction<EventSearchParams>>;
  searchCalendarMode: string;
  setSearchCalendarMode: React.Dispatch<React.SetStateAction<string>>;
  calendarSearchOptions: Calendar[];
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSearchPanelOpen: boolean;
  setIsSearchPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSearchSubmit: () => void | Promise<void>;
  onSearchClear: () => void;
  isSearchLoading: boolean;
}

export function DesktopCalendarSearch({
  isRtl,
  t,
  searchFilters,
  setSearchFilters,
  searchCalendarMode,
  setSearchCalendarMode,
  calendarSearchOptions,
  isSearchOpen,
  setIsSearchOpen,
  isSearchPanelOpen,
  setIsSearchPanelOpen,
  onSearchSubmit,
  onSearchClear,
  isSearchLoading,
}: SharedSearchProps) {
  const simpleQuery = searchFilters.query || '';

  return (
    <div className="relative hidden md:flex md:items-center">
      {!isSearchOpen ? (
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all hover:border-[#0038A8] hover:text-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          aria-label={t('searchEvents')}
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex h-11 w-[min(28rem,32vw)] items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.42)] dark:border-slate-700/70 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setIsSearchPanelOpen((prev) => !prev)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={t('toggleAdvancedSearch')}
            aria-expanded={isSearchPanelOpen}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isSearchPanelOpen ? 'rotate-180' : ''}`} />
          </button>
          <input
            autoFocus
            type="text"
            value={simpleQuery}
            onChange={(event) =>
              setSearchFilters((prev) => ({
                ...prev,
                query: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSearchSubmit();
              }
            }}
            placeholder={t('searchEventsPlaceholder')}
            className={`h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 ${isRtl ? 'text-right' : 'text-left'}`}
            aria-label={t('searchEvents')}
          />
          <button
            type="button"
            onClick={
              simpleQuery
                ? onSearchClear
                : () => {
                    setIsSearchOpen(false);
                    setIsSearchPanelOpen(false);
                  }
            }
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={simpleQuery ? t('clearSearch') : t('close')}
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onSearchSubmit}
            disabled={isSearchLoading}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0038A8] disabled:cursor-wait disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
            aria-label={t('searchEvents')}
          >
            {isSearchLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
      )}

      {isSearchOpen && isSearchPanelOpen ? (
        <div className="absolute right-0 top-full z-40 mt-3 w-[min(46rem,72vw)] overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.42)] dark:border-slate-700/70 dark:bg-slate-900">
          <div className="grid gap-3 px-4 pb-4 pt-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]">
            <label className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-300">
                {t('searchIn')}
              </span>
              <select
                value={searchCalendarMode}
                onChange={(event) => setSearchCalendarMode(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="selected">{t('searchInSelectedCalendars')}</option>
                <option value="all">{t('searchInAllCalendars')}</option>
                {calendarSearchOptions.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-300">
                {t('searchWhat')}
              </span>
              <input
                type="text"
                value={simpleQuery}
                onChange={(event) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    query: event.target.value,
                  }))
                }
                placeholder={t('searchWhatPlaceholder')}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-300">
                {t('searchFromDate')}
              </span>
              <input
                type="date"
                value={searchFilters.timeMin || ''}
                onChange={(event) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    timeMin: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-300">
                {t('searchToDate')}
              </span>
              <input
                type="date"
                value={searchFilters.timeMax || ''}
                onChange={(event) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    timeMax: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface MobileTextSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileTextSearchDialog({
  isOpen,
  onClose,
  isRtl,
  t,
  searchFilters,
  setSearchFilters,
  onSearchSubmit,
  onSearchClear,
  isSearchLoading,
}: MobileTextSearchDialogProps & Pick<SharedSearchProps, 'isRtl' | 't' | 'searchFilters' | 'setSearchFilters' | 'onSearchSubmit' | 'onSearchClear' | 'isSearchLoading'>) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-white dark:bg-slate-950 md:hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label={t('close')}
        >
          <X className="h-5 w-5" />
        </button>
        <input
          autoFocus
          type="text"
          value={searchFilters.query || ''}
          onChange={(event) =>
            setSearchFilters((prev) => ({
              ...prev,
              query: event.target.value,
            }))
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              setIsSubmitting(true);
              Promise.resolve(onSearchSubmit())
                .then(() => onClose())
                .finally(() => setIsSubmitting(false));
            }
          }}
          placeholder={t('searchEventsPlaceholder')}
          className={`h-11 min-w-0 flex-1 border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 ${isRtl ? 'text-right' : 'text-left'}`}
          aria-label={t('searchEvents')}
        />
        <button
          type="button"
          onClick={() => {
            setIsSubmitting(true);
            void Promise.resolve(onSearchSubmit())
              .then(() => onClose())
              .finally(() => setIsSubmitting(false));
          }}
          disabled={isSearchLoading || isSubmitting}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0038A8] disabled:cursor-wait disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
          aria-label={t('searchEvents')}
        >
          {isSearchLoading || isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </button>
      </div>
      <div className="px-4 py-4">
        <button
          type="button"
          onClick={() => {
            onSearchClear();
            onClose();
          }}
          className="text-sm font-bold text-[#0038A8] dark:text-blue-300"
        >
          {t('clearSearch')}
        </button>
      </div>
    </div>
  );
}

interface CalendarToolbarProps {
  isRtl: boolean;
  t: (key: string) => string;
  viewHDate: HDate;
  hMonthNameHebrew: string;
  hYear: string;
  gMonthRange: string;
  viewMode: CalendarViewMode;
  showEventAges: boolean;
  showFasts: boolean;
  showHolidayEvents: boolean;
  showNationalHolidays: boolean;
  showRoshChodesh: boolean;
  showWeeklyParsha: boolean;
  setShowEventAges: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFasts: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHolidayEvents: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNationalHolidays: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRoshChodesh: React.Dispatch<React.SetStateAction<boolean>>;
  setShowWeeklyParsha: React.Dispatch<React.SetStateAction<boolean>>;
  setViewMode: React.Dispatch<React.SetStateAction<CalendarViewMode>>;
  showGregorian: boolean;
  setShowGregorian: React.Dispatch<React.SetStateAction<boolean>>;
  handleNextMonth: () => void;
  handlePrevMonth: () => void;
  setViewHDate: React.Dispatch<React.SetStateAction<HDate>>;
  isSearchActive: boolean;
}

export function CalendarToolbar({
  isRtl,
  t,
  viewHDate,
  hMonthNameHebrew,
  hYear,
  gMonthRange,
  viewMode,
  showEventAges,
  showFasts,
  showHolidayEvents,
  showNationalHolidays,
  showRoshChodesh,
  showWeeklyParsha,
  setShowEventAges,
  setShowFasts,
  setShowHolidayEvents,
  setShowNationalHolidays,
  setShowRoshChodesh,
  setShowWeeklyParsha,
  setViewMode,
  showGregorian,
  setShowGregorian,
  handleNextMonth,
  handlePrevMonth,
  setViewHDate,
  isSearchActive,
}: CalendarToolbarProps) {
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
  const displayMenuRef = useRef<HTMLDivElement | null>(null);
  const handleSelectAllDisplayOptions = (): void => {
    setShowGregorian(true);
    setShowEventAges(true);
    setShowHolidayEvents(true);
    setShowNationalHolidays(true);
    setShowRoshChodesh(true);
    setShowFasts(true);
    setShowWeeklyParsha(true);
  };
  const handleClearAllDisplayOptions = (): void => {
    setShowGregorian(false);
    setShowEventAges(false);
    setShowHolidayEvents(false);
    setShowNationalHolidays(false);
    setShowRoshChodesh(false);
    setShowFasts(false);
    setShowWeeklyParsha(false);
  };

  useEffect(() => {
    if (!isDisplayMenuOpen) return undefined;

    const handlePointerDown = (event: MouseEvent): void => {
      if (!displayMenuRef.current?.contains(event.target as Node)) {
        setIsDisplayMenuOpen(false);
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsDisplayMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDisplayMenuOpen]);

  return (
    <section className="px-1 py-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center justify-start gap-1.5 md:w-auto md:gap-2.5">
          <button
            type="button"
            onClick={() => setViewHDate(new HDate())}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {t('today')}
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={isRtl ? handlePrevMonth : handlePrevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={isRtl ? handleNextMonth : handleNextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          <div className={`min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
            <h2 className="text-[1.6rem] font-black tracking-tight text-slate-900 dark:text-slate-50 md:text-[1.85rem]" style={{ fontFamily: isRtl ? "'Heebo', 'Rubik', sans-serif" : 'inherit' }}>
              {hMonthNameHebrew} {hYear}
            </h2>
            <p className={`text-[11px] font-medium md:text-xs ${showGregorian ? 'text-slate-400 dark:text-slate-500' : 'invisible'}`}>
              {gMonthRange} {viewHDate.greg().getFullYear()}
            </p>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-2 md:w-auto md:flex-wrap md:justify-end">
          {isSearchActive ? (
            <div className="hidden items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-[#0038A8] dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 md:inline-flex">
              <CalendarRange className="h-3.5 w-3.5" />
              <span>{t('searchResultsMode')}</span>
            </div>
          ) : null}
          <div className="inline-flex rounded-full border border-slate-300 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {t('viewMonth')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('schedule')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                viewMode === 'schedule'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {t('viewSchedule')}
            </button>
          </div>
          <div className="relative" ref={displayMenuRef}>
            <button
              type="button"
              onClick={() => setIsDisplayMenuOpen((prev) => !prev)}
              className="flex h-[34px] items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-expanded={isDisplayMenuOpen}
              aria-haspopup="menu"
            >
              <span>{t('displayOptions')}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDisplayMenuOpen ? (
              <div
                role="menu"
                className={`absolute top-full z-30 mt-2 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.42)] dark:border-slate-700 dark:bg-slate-900 ${isRtl ? 'left-0' : 'right-0'}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={handleSelectAllDisplayOptions}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-[#0038A8] transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {t('selectAllDisplayOptions')}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllDisplayOptions}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t('clearAllDisplayOptions')}
                  </button>
                </div>
                <div className="mb-1 border-t border-slate-200 dark:border-slate-700" />
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showGregorian}
                    onChange={(event) => setShowGregorian(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0038A8]"
                  />
                  <span>{t('showGregorianDates')}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showEventAges}
                    onChange={(event) => setShowEventAges(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0038A8]"
                  />
                  <span>{t('showEventAges')}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showHolidayEvents}
                    onChange={(event) => setShowHolidayEvents(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0038A8]"
                  />
                  <span>{t('showHolidayEvents')}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showNationalHolidays}
                    onChange={(event) => setShowNationalHolidays(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0038A8]"
                  />
                  <span>{t('showNationalHolidays')}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showRoshChodesh}
                    onChange={(event) => setShowRoshChodesh(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0038A8]"
                  />
                  <span>{t('showRoshChodesh')}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showFasts}
                    onChange={(event) => setShowFasts(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0038A8]"
                  />
                  <span>{t('showFasts')}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showWeeklyParsha}
                    onChange={(event) => setShowWeeklyParsha(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0038A8]"
                  />
                  <span>{t('showWeeklyParsha')}</span>
                </label>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

interface SearchResultsViewProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  isRtl: boolean;
  isSearchLoading: boolean;
  searchResults: GoogleCalendarEvent[];
  showEventAges: boolean;
  showGregorian: boolean;
  getEventColor: (event: GoogleCalendarEvent) => string;
  handleEventClick: (event: GoogleCalendarEvent) => void;
  calendars: Calendar[];
  onClearSearch: () => void;
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
  onClearSearch,
}: SearchResultsViewProps) {
  const calendarNameById = new Map(calendars.map((calendar) => [calendar.id, calendar.summary]));

  return (
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800 md:px-5">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            {t('searchResultsTitle')}
          </h3>
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
              const ageSuffix = getEventAgeSuffix(event, occurrenceHebrewYear, showEventAges);
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
                      {(event.summary || t('untitledEvent'))}{ageSuffix}
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
          </div>
        )}
      </div>
      {isSearchLoading ? <CalendarLoadingOverlay t={t} /> : null}
    </div>
  );
}

interface MonthCalendarViewProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  isRtl: boolean;
  days: Array<CalendarDay | null>;
  showEventAges: boolean;
  showFasts: boolean;
  showHolidayEvents: boolean;
  showNationalHolidays: boolean;
  showRoshChodesh: boolean;
  showWeeklyParsha: boolean;
  showGregorian: boolean;
  isMobileViewport: boolean;
  maxVisibleMonthEvents: number;
  getEventColor: (event: GoogleCalendarEvent) => string;
  handleEventClick: (event: GoogleCalendarEvent) => void;
  handleOverflowDayOpen: (
    dayObj: OverflowDay,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  handleCreateFromDay: (dayObj: OverflowDay) => void;
  isCalendarLoading: boolean;
  emptyStateMessage: string;
  emptyStateAction?: React.ReactNode;
}

export function MonthCalendarView({
  t,
  isRtl,
  days,
  showEventAges,
  showFasts,
  showHolidayEvents,
  showNationalHolidays,
  showRoshChodesh,
  showWeeklyParsha,
  showGregorian,
  isMobileViewport,
  maxVisibleMonthEvents,
  getEventColor,
  handleEventClick,
  handleOverflowDayOpen,
  handleCreateFromDay,
  isCalendarLoading,
  emptyStateMessage,
  emptyStateAction,
}: MonthCalendarViewProps) {
  const timeLocale = isRtl ? 'he-IL' : 'en-US';
  const hasVisibleEvents = days.some((dayObj) => dayObj?.events?.length > 0);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col md:h-full">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
          const weekdayLabel = t(`days.${idx}`);
          return (
            <div key={idx} className={`px-2 py-3 text-center text-[10px] font-bold md:text-xs ${idx === 6 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-300'}`}>
              <span className="hidden md:inline">{weekdayLabel}</span>
              <span className="md:hidden">{isRtl ? MOBILE_HEBREW_WEEKDAYS[idx] : weekdayLabel.substring(0, 1)}</span>
            </div>
          );
        })}
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto pb-14 md:pb-12">
        <div className="grid min-h-full grid-cols-7 auto-rows-[minmax(112px,1fr)] bg-white dark:bg-slate-900 md:auto-rows-[minmax(128px,1fr)]">
          {days.map((dayObj, i) => (
            <div key={i} className={`min-h-[112px] border-b border-l border-slate-200 transition-colors dark:border-slate-700/60 md:min-h-[128px] ${!dayObj ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900'}`}>
              {dayObj && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCreateFromDay(dayObj)}
                  onKeyDown={(event) => activateOnKeyboard(event, () => handleCreateFromDay(dayObj))}
                  className={`flex h-full min-h-0 cursor-pointer flex-col overflow-hidden px-1 py-1 transition-colors hover:bg-slate-50/80 md:px-2 md:py-1.5 dark:hover:bg-slate-800/40 ${dayObj.isToday ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}
                  aria-label={t('createEventOnDay', {
                    hebrewDay: dayObj.hDayGematriya,
                    gregorianDay: dayObj.gDay,
                  })}
                >
                  {(() => {
                    const holidayLabel =
                      showHolidayEvents || showNationalHolidays || showRoshChodesh || showFasts
                        ? getHolidayLabels(dayObj.gDate, {
                            includeFasts: showFasts,
                            includeHolidayEvents: showHolidayEvents,
                            includeNationalHolidays: showNationalHolidays,
                            includeRoshChodesh: showRoshChodesh,
                            locale: getHolidayLocale(isRtl),
                          }).join(' · ')
                        : '';
                    const parshaLabel =
                      showWeeklyParsha && dayObj.isShabbat
                        ? getShabbatParshaName(dayObj.gDate, {
                            locale: getParshaLocale(isRtl),
                          })
                        : null;

                    return (
                  <div className={`flex w-full items-start px-0.5 pb-1 md:px-1 ${isRtl ? 'justify-start text-right' : 'justify-start text-left'}`}>
                      <div className="flex w-full min-w-0 flex-col">
                        <div className="flex w-full min-w-0 flex-nowrap items-baseline gap-0.5 justify-start">
                          <span className={`inline-flex h-6 items-center px-0 text-[11px] font-bold leading-none md:h-7 md:min-w-7 md:justify-center md:rounded-full md:px-1.5 md:text-sm ${
                            dayObj.isToday
                              ? 'min-w-6 justify-center rounded-full bg-[#1a73e8] px-1 text-white shadow-sm md:min-w-7'
                              : 'justify-start text-slate-800 dark:text-slate-100'
                          }`}>
                            {isMobileViewport
                              ? formatMobileHebrewDayLabel(dayObj.hDayGematriya)
                              : dayObj.hDayGematriya}
                          </span>
                          {showGregorian && (
                            <span className="min-w-0 truncate text-[9px] font-medium leading-none text-slate-400 dark:text-slate-500 md:text-[10px]">
                              ({dayObj.gDay})
                            </span>
                          )}
                        </div>
                        {parshaLabel ? (
                          <div className="mt-0.5 truncate text-[9px] font-medium leading-tight text-amber-700 dark:text-amber-300 md:text-[10px]">
                            {parshaLabel}
                          </div>
                        ) : null}
                        {holidayLabel ? (
                          <div className="mt-0.5 truncate text-[9px] font-medium leading-tight text-rose-700 dark:text-rose-300 md:text-[10px]">
                            {holidayLabel}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    );
                  })()}
                  <div className="flex w-full flex-1 flex-col gap-0.5 overflow-hidden px-0 pb-0.5">
                    {dayObj.events.slice(0, maxVisibleMonthEvents).map((event, idx) => {
                      const ageSuffix = getEventAgeSuffix(event, dayObj.hYear, showEventAges);
                      const eventColor = getEventColor(event);
                      const timeLabel = formatEventTimeLabel(event, timeLocale);
                      const chipLabel = `${event.summary}${ageSuffix}`;
                      const isTimedEvent = Boolean(timeLabel);
                      return (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          type="button"
                          className={`group relative w-full flex-none cursor-pointer overflow-hidden text-[10px] font-bold leading-tight transition-all ${isRtl ? 'text-right' : 'text-left'} ${
                            isTimedEvent
                              ? 'rounded-sm px-0.5 py-0.5 text-slate-700 hover:bg-slate-100/80 dark:text-slate-100 dark:hover:bg-slate-800/70'
                              : 'rounded-md px-1.5 py-0.5 text-white hover:brightness-95'
                          }`}
                          style={isTimedEvent ? undefined : { backgroundColor: eventColor }}
                          title={timeLabel ? `${chipLabel} ${timeLabel}` : chipLabel}
                          aria-label={timeLabel ? `${chipLabel} ${timeLabel}` : chipLabel}
                        >
                          {isTimedEvent ? (
                            <div className="flex w-full">
                              <div className={`inline-flex min-w-0 items-center gap-1 ${isRtl ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: eventColor }}
                                />
                                <span className="shrink-0 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                  {timeLabel}
                                </span>
                                <span className="min-w-0 truncate">{chipLabel}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="truncate">{chipLabel}</div>
                          )}
                        </button>
                      );
                    })}
                    {dayObj.events.length > maxVisibleMonthEvents && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOverflowDayOpen(dayObj, event);
                        }}
                        className="px-1 text-right text-[10px] font-bold text-[#1a73e8] hover:underline dark:text-blue-300"
                        aria-label={t('moreEvents', { count: dayObj.events.length - maxVisibleMonthEvents })}
                      >
                        {isMobileViewport ? '...' : t('moreEvents', { count: dayObj.events.length - maxVisibleMonthEvents })}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {!isCalendarLoading && emptyStateMessage && !hasVisibleEvents ? (
          <div className="pointer-events-none absolute inset-0 z-[5]">
            <CalendarEmptyState message={emptyStateMessage} action={emptyStateAction} />
          </div>
        ) : null}
        {isCalendarLoading ? <CalendarLoadingOverlay t={t} /> : null}
      </div>
    </div>
  );
}

interface ScheduleCalendarViewProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  isRtl: boolean;
  showEventAges: boolean;
  showFasts: boolean;
  showHolidayEvents: boolean;
  showNationalHolidays: boolean;
  showRoshChodesh: boolean;
  showWeeklyParsha: boolean;
  showGregorian: boolean;
  scheduleDays: CalendarDay[];
  hMonthNameHebrew: string;
  getEventColor: (event: GoogleCalendarEvent) => string;
  handleEventClick: (event: GoogleCalendarEvent) => void;
  isCalendarLoading: boolean;
  handleCreateFromDay: (dayObj: OverflowDay) => void;
  emptyStateMessage: string;
  emptyStateAction?: React.ReactNode;
}

export function ScheduleCalendarView({
  t,
  isRtl,
  showEventAges,
  showFasts,
  showHolidayEvents,
  showNationalHolidays,
  showRoshChodesh,
  showWeeklyParsha,
  showGregorian,
  scheduleDays,
  hMonthNameHebrew: _hMonthNameHebrew,
  getEventColor,
  handleEventClick,
  isCalendarLoading,
  handleCreateFromDay,
  emptyStateMessage,
  emptyStateAction,
}: ScheduleCalendarViewProps) {
  return (
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-slate-900">
      <div className="h-full overflow-y-auto px-3 py-3 pb-14 dark:bg-slate-900 md:px-5 md:py-4 md:pb-12">
        {scheduleDays.length === 0 ? (
          <CalendarEmptyState
            message={emptyStateMessage || t('noEventsInView')}
            action={emptyStateAction}
          />
        ) : (
          <div className="space-y-3">
            {scheduleDays.map((dayObj) => (
              (() => {
                const holidayLabel =
                  showHolidayEvents || showNationalHolidays || showRoshChodesh || showFasts
                    ? getHolidayLabels(dayObj.gDate, {
                        includeFasts: showFasts,
                        includeHolidayEvents: showHolidayEvents,
                        includeNationalHolidays: showNationalHolidays,
                        includeRoshChodesh: showRoshChodesh,
                        locale: getHolidayLocale(isRtl),
                      }).join(' · ')
                    : '';
                const parshaLabel =
                  showWeeklyParsha && dayObj.isShabbat
                    ? getShabbatParshaName(dayObj.gDate, {
                        locale: getParshaLocale(isRtl),
                      })
                    : null;

                return (
              <section
                key={dayObj.gDate.toISOString()}
                className="grid grid-cols-[44px_minmax(0,1fr)] gap-0.5 border-b border-slate-100 pb-3 last:border-b-0 dark:border-slate-800 md:grid-cols-[60px_minmax(0,1fr)] md:gap-1"
              >
                <button
                  type="button"
                  onClick={() => handleCreateFromDay(dayObj)}
                  className="flex flex-col items-center pt-1 text-center transition-colors hover:text-[#1a73e8]"
                  aria-label={t('createEventOnDay', {
                    hebrewDay: dayObj.hDayGematriya,
                    gregorianDay: dayObj.gDay,
                  })}
                >
                  <div className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black md:h-9 md:w-9 md:text-[15px] ${dayObj.isToday ? 'bg-[#1a73e8] text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>
                    {dayObj.hDayGematriya}
                  </div>
                  <div className="mt-1 text-center text-[10px] font-bold text-slate-800 dark:text-slate-100 md:text-[11px]">
                    {t(`days.${dayObj.weekday}`)}
                  </div>
                  {parshaLabel ? (
                    <div className="mt-1 text-center text-[9px] font-medium leading-tight text-amber-700 dark:text-amber-300 md:text-[10px]">
                      {parshaLabel}
                    </div>
                  ) : null}
                  {holidayLabel ? (
                    <div className="mt-1 text-center text-[9px] font-medium leading-tight text-rose-700 dark:text-rose-300 md:text-[10px]">
                      {holidayLabel}
                    </div>
                  ) : null}
                  <div
                    aria-hidden={!showGregorian}
                    className={`text-center text-[9px] font-medium md:text-[10px] ${
                      showGregorian
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'invisible'
                    }`}
                  >
                    {dayObj.gMonthLabel} {dayObj.gDay}
                  </div>
                </button>

                <div className="space-y-1.5">
                  {dayObj.events.map((event, idx) => {
                    const props = event.extendedProperties?.private || {};
                    const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                    const ageSuffix = getEventAgeSuffix(event, dayObj.hYear, showEventAges);
                    const eventColor = getEventColor(event);
                    const start = event.start?.dateTime || event.start?.date;
                    const end = event.end?.dateTime || event.end?.date;
                    const timeLabel = event.start?.dateTime
                      ? `${new Date(start || '').toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}${end ? ` - ${new Date(end).toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}`
                      : '';

                    return (
                      <button
                        key={`${event.id || event.summary}-${idx}`}
                        type="button"
                        onClick={() => handleEventClick(event)}
                        className={`flex w-full items-start gap-2 rounded-2xl border px-2.5 py-2 text-right transition-all ${
                          isHebCal
                            ? 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                            : 'border-transparent hover:brightness-[0.98]'
                        }`}
                        style={
                          isHebCal
                            ? undefined
                            : {
                                backgroundColor: hexToRgba(eventColor, 0.18),
                              }
                        }
                      >
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: eventColor }} />
                        <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">{event.summary}{ageSuffix}</div>
                        </div>
                        {timeLabel && (
                          <div className="shrink-0 pt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 md:text-xs">
                            {timeLabel}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
                );
              })()
            ))}
          </div>
        )}
      </div>
      {isCalendarLoading ? <CalendarLoadingOverlay t={t} /> : null}
    </div>
  );
}

interface DayEventsPopoverProps {
  overflowDay: OverflowDay | null;
  isRtl: boolean;
  closeDayEventsLabel: string;
  dayEventsDialogLabel: string;
  overflowPopoverWidth: number;
  overflowPopoverMargin: number;
  overflowTop: number;
  overflowLeft: number;
  showEventAges: boolean;
  showGregorian: boolean;
  getEventColor: (event: GoogleCalendarEvent) => string;
  setOverflowDay: React.Dispatch<React.SetStateAction<OverflowDay | null>>;
  handleOverflowEventClick: (event: GoogleCalendarEvent) => void;
}

export function DayEventsPopover({
  overflowDay,
  isRtl,
  closeDayEventsLabel,
  dayEventsDialogLabel,
  overflowPopoverWidth,
  overflowPopoverMargin,
  overflowTop,
  overflowLeft,
  showEventAges,
  showGregorian,
  getEventColor,
  setOverflowDay,
  handleOverflowEventClick,
}: DayEventsPopoverProps) {
  if (!overflowDay) return null;

  return (
    <div className="fixed inset-0 z-40" dir={isRtl ? 'rtl' : 'ltr'}>
      <button
        type="button"
        aria-label={closeDayEventsLabel}
        onClick={() => setOverflowDay(null)}
        className="absolute inset-0 cursor-default bg-transparent"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dayEventsDialogLabel}
        className="absolute z-10 overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{
          width: `${overflowPopoverWidth}px`,
          maxWidth: `calc(100vw - ${overflowPopoverMargin * 2}px)`,
          top: `${overflowTop}px`,
          left: `${overflowLeft}px`,
        }}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-2 py-1.5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setOverflowDay(null)}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {showGregorian ? `${overflowDay.gDay}` : ''}
            </div>
            <div className="mt-0.5 text-lg font-black text-slate-900 dark:text-slate-50">
              {overflowDay.hDayGematriya}
            </div>
          </div>
          <div className="w-5" />
        </div>

        <div className="space-y-1 px-1.5 py-1.5">
          {overflowDay.events.map((event, idx) => {
            const props = event.extendedProperties?.private || {};
            const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
            const ageSuffix = getEventAgeSuffix(event, overflowDay.hYear, showEventAges);
            const eventColor = getEventColor(event);
            const start = event.start?.dateTime || event.start?.date;
            const timeLabel =
              start && event.start?.dateTime
                ? new Date(start).toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

            return (
              <button
                key={`${event.id || event.summary}-${idx}`}
                type="button"
                onClick={() => handleOverflowEventClick(event)}
                className={`w-full overflow-hidden rounded-md border text-right transition-all ${
                  isHebCal
                    ? 'border-transparent text-white hover:brightness-95'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                }`}
                style={
                  isHebCal
                    ? { backgroundColor: eventColor }
                    : {
                        backgroundColor: hexToRgba(eventColor, 0.22),
                        boxShadow: `inset 3px 0 0 ${eventColor}`,
                      }
                }
              >
                <div className="px-2 py-1.5">
                  <div className="truncate text-[10px] font-bold leading-4">{event.summary}{ageSuffix}</div>
                  {timeLabel && (
                    <div className={`mt-0.5 text-[9px] font-semibold ${isHebCal ? 'text-white/85' : 'text-slate-400 dark:text-slate-300'}`}>
                      {timeLabel}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
