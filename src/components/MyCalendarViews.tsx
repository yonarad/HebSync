import { ChevronLeft, ChevronRight, LoaderCircle, X } from 'lucide-react';
import { HDate } from '@hebcal/core';
import type { KeyboardEvent } from 'react';
import type {
  CalendarDay,
  CalendarViewMode,
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

function CalendarEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-3xl border border-dashed border-slate-300 bg-slate-50/90 px-6 py-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <p className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
          {message}
        </p>
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

interface CalendarToolbarProps {
  isRtl: boolean;
  t: (key: string) => string;
  viewHDate: HDate;
  hMonthNameHebrew: string;
  hYear: string;
  gMonthRange: string;
  viewMode: CalendarViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<CalendarViewMode>>;
  showGregorian: boolean;
  setShowGregorian: React.Dispatch<React.SetStateAction<boolean>>;
  handleNextMonth: () => void;
  handlePrevMonth: () => void;
  setViewHDate: React.Dispatch<React.SetStateAction<HDate>>;
}

export function CalendarToolbar({
  isRtl,
  t,
  viewHDate,
  hMonthNameHebrew,
  hYear,
  gMonthRange,
  viewMode,
  setViewMode,
  showGregorian,
  setShowGregorian,
  handleNextMonth,
  handlePrevMonth,
  setViewHDate,
}: CalendarToolbarProps) {
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
          <label className="flex h-[34px] items-center gap-2 cursor-pointer rounded-full border border-slate-300 bg-white px-3 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <input type="checkbox" checked={showGregorian} onChange={(e) => setShowGregorian(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-[#0038A8]" />
            <span>{t('showGregorianDates')}</span>
          </label>
        </div>
      </div>
    </section>
  );
}

interface MonthCalendarViewProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  isRtl: boolean;
  days: Array<CalendarDay | null>;
  showGregorian: boolean;
  isMobileViewport: boolean;
  maxVisibleMonthEvents: number;
  getCalendarColor: (calendarId?: string) => string;
  handleEventClick: (event: GoogleCalendarEvent) => void;
  handleOverflowDayOpen: (
    dayObj: OverflowDay,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  handleCreateFromDay: (dayObj: OverflowDay) => void;
  isCalendarLoading: boolean;
  emptyStateMessage: string;
}

export function MonthCalendarView({
  t,
  isRtl,
  days,
  showGregorian,
  isMobileViewport,
  maxVisibleMonthEvents,
  getCalendarColor,
  handleEventClick,
  handleOverflowDayOpen,
  handleCreateFromDay,
  isCalendarLoading,
  emptyStateMessage,
}: MonthCalendarViewProps) {
  const timeLocale = isRtl ? 'he-IL' : 'en-US';
  const hasVisibleEvents = days.some((dayObj) => dayObj?.events?.length > 0);

  return (
    <div className="relative flex flex-1 flex-col md:h-full">
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
      <div className="relative flex-1">
        <div className="grid grid-cols-7 auto-rows-auto bg-white dark:bg-slate-900 md:h-full md:auto-rows-fr md:overflow-hidden">
          {days.map((dayObj, i) => (
            <div key={i} className={`min-h-[112px] border-b border-l border-slate-200 transition-colors dark:border-slate-700/60 md:min-h-0 ${!dayObj ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900'}`}>
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
                  <div className={`flex w-full items-start px-0.5 pb-1 md:px-1 ${isRtl ? 'justify-start text-right' : 'justify-end text-left'}`}>
                    <div className={`flex w-full items-baseline gap-px ${isRtl ? 'justify-start' : 'justify-end'}`}>
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none md:h-7 md:min-w-7 md:px-1.5 md:text-sm ${
                        dayObj.isToday
                          ? 'bg-[#1a73e8] text-white shadow-sm'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        {dayObj.hDayGematriya}
                      </span>
                      {showGregorian && (
                        <span className="text-[9px] font-medium leading-none text-slate-400 dark:text-slate-500 md:text-[10px]">
                          ({dayObj.gDay})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex w-full flex-1 flex-col gap-0.5 overflow-hidden px-0 pb-0.5">
                    {dayObj.events.slice(0, maxVisibleMonthEvents).map((event, idx) => {
                      const props = event.extendedProperties?.private || {};
                      const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                      const originalYear = isHebCal ? parseInt(props.originalHebrewYear || '', 10) : null;
                      const age = originalYear && dayObj.hYear ? dayObj.hYear - originalYear : 0;
                      const ageSuffix = isHebCal ? ` (${age})` : '';
                      const eventColor = getCalendarColor(event.calendarId);
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
            <CalendarEmptyState message={emptyStateMessage} />
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
  showGregorian: boolean;
  scheduleDays: CalendarDay[];
  hMonthNameHebrew: string;
  getCalendarColor: (calendarId?: string) => string;
  handleEventClick: (event: GoogleCalendarEvent) => void;
  isCalendarLoading: boolean;
  handleCreateFromDay: (dayObj: OverflowDay) => void;
  emptyStateMessage: string;
}

export function ScheduleCalendarView({
  t,
  isRtl,
  showGregorian,
  scheduleDays,
  hMonthNameHebrew: _hMonthNameHebrew,
  getCalendarColor,
  handleEventClick,
  isCalendarLoading,
  handleCreateFromDay,
  emptyStateMessage,
}: ScheduleCalendarViewProps) {
  return (
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-slate-900">
      <div className="h-full overflow-y-auto px-3 py-3 dark:bg-slate-900 md:px-5 md:py-4">
        {scheduleDays.length === 0 ? (
          <CalendarEmptyState message={emptyStateMessage || t('noEventsInView')} />
        ) : (
          <div className="space-y-3">
            {scheduleDays.map((dayObj) => (
              <section
                key={dayObj.gDate.toISOString()}
                className="grid grid-cols-[44px_minmax(0,1fr)] gap-0.5 border-b border-slate-100 pb-3 last:border-b-0 dark:border-slate-800 md:grid-cols-[60px_minmax(0,1fr)] md:gap-1"
              >
                <button
                  type="button"
                  onClick={() => handleCreateFromDay(dayObj)}
                  className={`pt-1 transition-colors hover:text-[#1a73e8] ${isRtl ? 'text-right' : 'text-left'}`}
                  aria-label={t('createEventOnDay', {
                    hebrewDay: dayObj.hDayGematriya,
                    gregorianDay: dayObj.gDay,
                  })}
                >
                  <div className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black md:h-9 md:w-9 md:text-[15px] ${dayObj.isToday ? 'bg-[#1a73e8] text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>
                    {dayObj.isToday ? dayObj.gDay : dayObj.hDayGematriya}
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-slate-800 dark:text-slate-100 md:text-[11px]">
                    {t(`days.${dayObj.weekday}`)}
                  </div>
                  {showGregorian ? (
                    <div className="text-[9px] font-medium text-slate-400 dark:text-slate-500 md:text-[10px]">
                      {dayObj.gMonthLabel} {dayObj.gDay}
                    </div>
                  ) : null}
                </button>

                <div className="space-y-1.5">
                  {dayObj.events.map((event, idx) => {
                    const props = event.extendedProperties?.private || {};
                    const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                    const originalYear = isHebCal ? parseInt(props.originalHebrewYear || '', 10) : null;
                    const age = originalYear && dayObj.hYear ? dayObj.hYear - originalYear : 0;
                    const ageSuffix = isHebCal ? ` (${age})` : '';
                    const eventColor = getCalendarColor(event.calendarId);
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
  showGregorian: boolean;
  getCalendarColor: (calendarId?: string) => string;
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
  showGregorian,
  getCalendarColor,
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
            const originalYear = isHebCal ? parseInt(props.originalHebrewYear || '', 10) : null;
            const age = originalYear && overflowDay.hYear ? overflowDay.hYear - originalYear : 0;
            const ageSuffix = isHebCal ? ` (${age})` : '';
            const eventColor = getCalendarColor(event.calendarId);
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
