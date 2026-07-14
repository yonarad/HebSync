import { useEffect, useMemo, useRef } from 'react';
import {
  getHolidayDetails,
  getHolidayLabels,
  getShabbatParshaDetail,
  getShabbatParshaName,
} from '../utils/hebcal';
import type {
  CalendarDay,
  GoogleCalendarEvent,
  HebcalDisplayDetail,
  OverflowDay,
} from '../types/appTypes';
import {
  activateOnKeyboard,
  CalendarEmptyState,
  CalendarLoadingOverlay,
  getEventAgeSuffix,
  getHolidayLocale,
  getParshaLocale,
} from './calendarViewUtils';

export interface ScheduleCalendarViewProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  isRtl: boolean;
  showEventAges: boolean;
  showFasts: boolean;
  showHolidayEvents: boolean;
  showNationalHolidays: boolean;
  showRoshChodesh: boolean;
  showSpecialShabbat: boolean;
  showWeeklyParsha: boolean;
  showGregorian: boolean;
  scheduleDays: CalendarDay[];
  hMonthNameHebrew: string;
  getEventColor: (event: GoogleCalendarEvent) => string;
  handleEventClick: (event: GoogleCalendarEvent) => void;
  handleHebcalDetailsClick: (title: string, details: HebcalDisplayDetail[]) => void;
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
  showSpecialShabbat,
  showWeeklyParsha,
  showGregorian,
  scheduleDays,
  hMonthNameHebrew: _hMonthNameHebrew,
  getEventColor,
  handleEventClick,
  handleHebcalDetailsClick,
  isCalendarLoading,
  handleCreateFromDay,
  emptyStateMessage,
  emptyStateAction,
}: ScheduleCalendarViewProps) {
  const daySectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const getDayDateKey = (date: Date): string => date.toISOString().slice(0, 10);
  const initialScrollTargetKey = useMemo(() => {
    if (scheduleDays.length === 0) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const todayMatch = scheduleDays.find((dayObj) => {
      const dayDate = new Date(dayObj.gDate);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === todayTime;
    });

    if (todayMatch) {
      return getDayDateKey(todayMatch.gDate);
    }

    const nearestDay = scheduleDays.reduce((closest, dayObj) => {
      const dayDate = new Date(dayObj.gDate);
      dayDate.setHours(0, 0, 0, 0);
      const diff = dayDate.getTime() - todayTime;

      if (!closest) {
        return { dayObj, diff };
      }

      const absDiff = Math.abs(diff);
      const closestAbsDiff = Math.abs(closest.diff);

      if (absDiff < closestAbsDiff) {
        return { dayObj, diff };
      }

      if (absDiff === closestAbsDiff && diff > closest.diff) {
        return { dayObj, diff };
      }

      return closest;
    }, null as { dayObj: CalendarDay; diff: number } | null);

    return nearestDay ? getDayDateKey(nearestDay.dayObj.gDate) : null;
  }, [scheduleDays]);

  useEffect(() => {
    if (!initialScrollTargetKey) {
      return;
    }

    const targetSection = daySectionRefs.current[initialScrollTargetKey];
    targetSection?.scrollIntoView({ block: 'start' });
  }, [initialScrollTargetKey]);

  return (
    <div
      data-testid="schedule-calendar-view"
      className="relative flex-1 overflow-hidden bg-white dark:bg-slate-900"
    >
      <div className="h-full overflow-y-auto px-3 py-3 pb-14 dark:bg-slate-900 md:px-5 md:py-4 md:pb-12">
        {scheduleDays.length === 0 ? (
          <CalendarEmptyState
            message={emptyStateMessage || t('noEventsInView')}
            action={emptyStateAction}
          />
        ) : (
          <div className="space-y-3">
            {scheduleDays.map((dayObj) => {
              const holidayLabel =
                showHolidayEvents || showNationalHolidays || showRoshChodesh || showSpecialShabbat || showFasts
                  ? getHolidayLabels(dayObj.gDate, {
                      includeFasts: showFasts,
                      includeHolidayEvents: showHolidayEvents,
                      includeNationalHolidays: showNationalHolidays,
                      includeRoshChodesh: showRoshChodesh,
                      includeSpecialShabbat: showSpecialShabbat,
                      locale: getHolidayLocale(isRtl),
                    }).join(' \u05b2· ')
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
                  ref={(node) => {
                    daySectionRefs.current[getDayDateKey(dayObj.gDate)] = node;
                  }}
                  data-schedule-date={getDayDateKey(dayObj.gDate)}
                  className="grid grid-cols-[44px_minmax(0,1fr)] gap-0.5 border-b border-slate-100 pb-3 last:border-b-0 dark:border-slate-800 md:grid-cols-[60px_minmax(0,1fr)] md:gap-1"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCreateFromDay(dayObj)}
                    onKeyDown={(event) => activateOnKeyboard(event, () => handleCreateFromDay(dayObj))}
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
                  </div>

                  <div className="space-y-1.5">
                    {parshaLabel ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const detail = getShabbatParshaDetail(dayObj.gDate, {
                            locale: getParshaLocale(isRtl),
                          });
                          if (detail) {
                            handleHebcalDetailsClick(t('parshaDetails'), [detail]);
                          }
                        }}
                        className={`flex w-full items-start rounded-2xl border border-amber-200/70 bg-amber-50/80 px-2.5 py-2 text-right text-sm font-bold leading-tight text-amber-800 transition-opacity hover:opacity-80 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200 ${isRtl ? 'text-right' : 'text-left'}`}
                        title={parshaLabel}
                      >
                        {parshaLabel}
                      </button>
                    ) : null}
                    {holidayLabel ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const details = getHolidayDetails(dayObj.gDate, {
                            includeFasts: showFasts,
                            includeHolidayEvents: showHolidayEvents,
                            includeNationalHolidays: showNationalHolidays,
                            includeRoshChodesh: showRoshChodesh,
                            includeSpecialShabbat: showSpecialShabbat,
                            locale: getHolidayLocale(isRtl),
                          });
                          if (details.length > 0) {
                            handleHebcalDetailsClick(t('holidayDetails'), details);
                          }
                        }}
                        className={`flex w-full items-start rounded-2xl border border-rose-200/70 bg-rose-50/80 px-2.5 py-2 text-right text-sm font-bold leading-tight text-rose-800 transition-opacity hover:opacity-80 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200 ${isRtl ? 'text-right' : 'text-left'}`}
                        title={holidayLabel}
                      >
                        {holidayLabel}
                      </button>
                    ) : null}
                    {dayObj.events.map((event, idx) => {
                      const ageSuffix = getEventAgeSuffix(event, dayObj.hYear, showEventAges);
                      const eventColor = getEventColor(event);
                      const start = event.start?.dateTime || event.start?.date;
                      const end = event.end?.dateTime || event.end?.date;
                      const timeLabel = event.start?.dateTime
                        ? `${new Date(start || '').toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}${end ? ` - ${new Date(end).toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}`
                        : '';
                      const isTimedEvent = Boolean(timeLabel);
                      const isRecurring = Boolean(event.recurringEventId || event.recurrence?.length);
                      const eventLabel = `${event.summary}${ageSuffix}`;

                      return (
                        <button
                          key={`${event.id || event.summary}-${idx}`}
                          data-testid={isRecurring ? 'schedule-recurring-event-chip' : 'schedule-event-chip'}
                          type="button"
                          onClick={() => handleEventClick(event)}
                          className={`flex w-full items-start rounded-2xl px-2.5 py-2 transition-all ${isRtl ? 'text-right' : 'text-left'} ${
                            isTimedEvent
                              ? 'gap-2 border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                              : 'border border-transparent text-white hover:brightness-95'
                          }`}
                          style={isTimedEvent ? undefined : { backgroundColor: eventColor }}
                          title={timeLabel ? `${eventLabel} ${timeLabel}` : eventLabel}
                          aria-label={timeLabel ? `${eventLabel} ${timeLabel}` : eventLabel}
                        >
                          {isTimedEvent ? (
                            <>
                              <span
                                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: eventColor }}
                              />
                              <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <span className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 md:text-xs">
                                    {timeLabel}
                                  </span>
                                  <span className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                                    {eventLabel}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                              {eventLabel}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
      {isCalendarLoading ? <CalendarLoadingOverlay t={t} /> : null}
    </div>
  );
}
