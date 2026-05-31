import { LoaderCircle, Search, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Calendar, EventSearchParams } from '../types/appTypes';

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
    <div data-testid="desktop-calendar-search" className="relative hidden md:flex md:items-center">
      {!isSearchOpen ? (
        <button
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
            type="button"
            onClick={() => setIsSearchPanelOpen((prev) => !prev)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={t('toggleAdvancedSearch')}
            aria-expanded={isSearchPanelOpen}
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
}: MobileTextSearchDialogProps &
  Pick<
    SharedSearchProps,
    'isRtl' | 't' | 'searchFilters' | 'setSearchFilters' | 'onSearchSubmit' | 'onSearchClear' | 'isSearchLoading'
  >) {
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
