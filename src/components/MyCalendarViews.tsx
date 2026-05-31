import { HDate } from '@hebcal/core';
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CalendarViewMode } from '../types/appTypes';

export { MonthCalendarView } from './MonthCalendarView';
export { ScheduleCalendarView } from './ScheduleCalendarView';
export { DayEventsPopover } from './DayEventsPopover';
export {
  DesktopCalendarSearch,
  MobileTextSearchDialog,
} from './CalendarSearchControls';
export { SearchResultsView } from './SearchResultsView';

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
  showSpecialShabbat: boolean;
  showWeeklyParsha: boolean;
  setShowEventAges: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFasts: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHolidayEvents: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNationalHolidays: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRoshChodesh: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSpecialShabbat: React.Dispatch<React.SetStateAction<boolean>>;
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
  showSpecialShabbat,
  showWeeklyParsha,
  setShowEventAges,
  setShowFasts,
  setShowHolidayEvents,
  setShowNationalHolidays,
  setShowRoshChodesh,
  setShowSpecialShabbat,
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
    setShowSpecialShabbat(true);
    setShowFasts(true);
    setShowWeeklyParsha(true);
  };

  const handleClearAllDisplayOptions = (): void => {
    setShowGregorian(false);
    setShowEventAges(false);
    setShowHolidayEvents(false);
    setShowNationalHolidays(false);
    setShowRoshChodesh(false);
    setShowSpecialShabbat(false);
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
              onClick={handlePrevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          <div className={`min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
            <h2
              className="text-[1.6rem] font-black tracking-tight text-slate-900 dark:text-slate-50 md:text-[1.85rem]"
              style={{ fontFamily: isRtl ? "'Heebo', 'Rubik', sans-serif" : 'inherit' }}
            >
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
                    checked={showSpecialShabbat}
                    onChange={(event) => setShowSpecialShabbat(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0038A8]"
                  />
                  <span>{t('showSpecialShabbat')}</span>
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
