import { LoaderCircle, Search, X, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { HDate } from '@hebcal/core';
import type { Calendar, EventSearchParams } from '../types/appTypes';
import { doesHebrewMonthExistInYear, formatHebrewYear, getMonthsForYear } from '../utils/hebcal';
import { focusFirstElement, trapFocusWithin } from './focusUtils';

export interface SharedSearchProps {
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

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveHebrewMonthForYear(monthName: string, targetYear: number): string {
  if (doesHebrewMonthExistInYear(targetYear, monthName)) {
    return monthName;
  }

  if (monthName === 'Adar' && doesHebrewMonthExistInYear(targetYear, 'Adar II')) {
    return 'Adar II';
  }

  if ((monthName === 'Adar I' || monthName === 'Adar II') && doesHebrewMonthExistInYear(targetYear, 'Adar')) {
    return 'Adar';
  }

  return monthName;
}

function getHebrewBoundaryParts(value: string | undefined): { year: number; monthName: string } {
  const parsedDate = value ? new Date(`${value}T12:00:00`) : new Date();
  const hDate = new HDate(Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate);
  return {
    year: hDate.getFullYear(),
    monthName: hDate.getMonthName(),
  };
}

function buildGregorianBoundaryFromHebrew(
  year: number,
  monthName: string,
  boundary: 'start' | 'end',
): string {
  const safeMonthName = resolveHebrewMonthForYear(monthName, year);
  const day =
    boundary === 'start'
      ? 1
      : HDate.daysInMonth(HDate.monthFromName(safeMonthName), year);
  return formatDateInputValue(new HDate(day, safeMonthName, year).greg());
}

function HebrewBoundaryField({
  t,
  value,
  boundary,
  fieldLabel,
  onChange,
}: {
  t: (key: string) => string;
  value: string | undefined;
  boundary: 'start' | 'end';
  fieldLabel: string;
  onChange: (nextValue: string) => void;
}) {
  const { year, monthName } = getHebrewBoundaryParts(value);
  const months = getMonthsForYear(year);
  const currentHebrewYear = new HDate().getFullYear();
  const yearOptions = Array.from({ length: 61 }, (_, index) => currentHebrewYear + 30 - index);

  const updateYear = (rawYear: string) => {
    const nextYear = Number.parseInt(rawYear, 10);
    if (!Number.isFinite(nextYear) || nextYear <= 0) return;
    onChange(buildGregorianBoundaryFromHebrew(nextYear, monthName, boundary));
  };

  const updateMonth = (nextMonth: string) => {
    onChange(buildGregorianBoundaryFromHebrew(year, nextMonth, boundary));
  };

  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
      <label className="space-y-1.5">
        <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-300">
          {t('month')}
        </span>
        <select
          value={resolveHebrewMonthForYear(monthName, year)}
          onChange={(event) => updateMonth(event.target.value)}
          aria-label={`${fieldLabel} ${t('month')}`}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {months.map((month) => (
            <option key={month.id} value={month.id}>
              {month.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-300">
          {t('hebrewYear')}
        </span>
        <select
          value={year}
          onChange={(event) => updateYear(event.target.value)}
          aria-label={`${fieldLabel} ${t('hebrewYear')}`}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {yearOptions.map((optionYear) => (
            <option key={optionYear} value={optionYear}>
              {formatHebrewYear(optionYear)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
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
  const advancedSearchPanelId = useId();
  const searchRootRef = useRef<HTMLDivElement | null>(null);
  const searchToggleRef = useRef<HTMLButtonElement | null>(null);
  const advancedSearchPanelRef = useRef<HTMLDivElement | null>(null);
  const wasSearchOpenRef = useRef(false);

  useEffect(() => {
    if (!isSearchOpen) {
      if (wasSearchOpenRef.current) {
        searchToggleRef.current?.focus();
      }
      wasSearchOpenRef.current = false;
      return undefined;
    }

    wasSearchOpenRef.current = true;

    const handlePointerDown = (event: MouseEvent): void => {
      if (!searchRootRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setIsSearchPanelOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsSearchOpen(false);
        setIsSearchPanelOpen(false);
        return;
      }

      if (isSearchPanelOpen) {
        trapFocusWithin(searchRootRef.current, event);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen, isSearchPanelOpen, setIsSearchOpen, setIsSearchPanelOpen]);

  useEffect(() => {
    if (!isSearchOpen || !isSearchPanelOpen) return undefined;

    focusFirstElement(advancedSearchPanelRef.current);
    return undefined;
  }, [isSearchOpen, isSearchPanelOpen]);

  return (
    <div
      ref={searchRootRef}
      data-testid="desktop-calendar-search"
      className="relative hidden md:flex md:items-center"
    >
      {!isSearchOpen ? (
        <button
          ref={searchToggleRef}
          data-testid="desktop-search-toggle"
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
            data-testid="desktop-search-advanced-toggle"
            type="button"
            onClick={() => setIsSearchPanelOpen((prev) => !prev)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={t('toggleAdvancedSearch')}
            aria-expanded={isSearchPanelOpen}
            aria-controls={advancedSearchPanelId}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isSearchPanelOpen ? 'rotate-180' : ''}`} />
          </button>
          <input
            data-testid="desktop-search-input"
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
            data-testid="desktop-search-submit"
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
        <div
          ref={advancedSearchPanelRef}
          id={advancedSearchPanelId}
          data-testid="desktop-search-panel"
          role="region"
          aria-label={t('toggleAdvancedSearch')}
          className="absolute left-1/2 top-full z-40 mt-3 w-[min(42rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.42)] dark:border-slate-700/70 dark:bg-slate-900"
        >
          <div className="grid gap-4 px-4 pb-4 pt-4 md:grid-cols-2">
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
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                <HebrewBoundaryField
                  t={t}
                  value={searchFilters.timeMin}
                  boundary="start"
                  fieldLabel={t('searchFromDate')}
                  onChange={(nextValue) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      timeMin: nextValue,
                    }))
                  }
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-300">
                {t('searchToDate')}
              </span>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                <HebrewBoundaryField
                  t={t}
                  value={searchFilters.timeMax}
                  boundary="end"
                  fieldLabel={t('searchToDate')}
                  onChange={(nextValue) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      timeMax: nextValue,
                    }))
                  }
                />
              </div>
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
}: MobileTextSearchDialogProps &
  Pick<
    SharedSearchProps,
    'isRtl' | 't' | 'searchFilters' | 'setSearchFilters' | 'onSearchSubmit' | 'onSearchClear' | 'isSearchLoading'
  >) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    if (!isOpen) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      return undefined;
    }

    if (typeof document !== 'undefined') {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      trapFocusWithin(dialogRef.current, event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      data-testid="mobile-search-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      className="fixed inset-0 z-[70] bg-white dark:bg-slate-950 md:hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label={t('close')}
        >
          <X className="h-5 w-5" />
        </button>
        <span id={dialogTitleId} className="sr-only">
          {t('searchEvents')}
        </span>
        <input
          data-testid="mobile-search-input"
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
          data-testid="mobile-search-submit"
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
      <div className="space-y-4 px-4 py-4">
        <div className="grid gap-3">
          <label className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-500 dark:text-slate-300">
              {t('searchFromDate')}
            </span>
            <HebrewBoundaryField
              t={t}
              value={searchFilters.timeMin}
              boundary="start"
              fieldLabel={t('searchFromDate')}
              onChange={(nextValue) =>
                setSearchFilters((prev) => ({
                  ...prev,
                  timeMin: nextValue,
                }))
              }
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-500 dark:text-slate-300">
              {t('searchToDate')}
            </span>
            <HebrewBoundaryField
              t={t}
              value={searchFilters.timeMax}
              boundary="end"
              fieldLabel={t('searchToDate')}
              onChange={(nextValue) =>
                setSearchFilters((prev) => ({
                  ...prev,
                  timeMax: nextValue,
                }))
              }
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
    </div>
  );
}
