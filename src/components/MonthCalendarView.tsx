import { useMemo } from 'react';
import {
  getHolidayDetails,
  getHolidayLabels,
  getShabbatParshaDetail,
  getShabbatParshaName,
} from '../utils/hebcal';
import { useMonthVisibleEventCounts } from '../hooks/useMonthVisibleEventCounts';
import type {
  CalendarDay,
  GoogleCalendarEvent,
  HebcalDisplayDetail,
  OverflowDay,
} from '../types/appTypes';
import {
  MOBILE_HEBREW_WEEKDAYS,
  CalendarEmptyState,
  CalendarLoadingOverlay,
  formatEventTimeLabel,
  formatMobileHebrewDayLabel,
  getEventAgeSuffix,
  getHolidayLocale,
  getMonthDayKey,
  getParshaLocale,
} from './calendarViewUtils';
import {
  MONTH_EVENT_STACK_CLASS,
  MORE_EVENTS_BUTTON_CLASS,
  MORE_EVENTS_MEASURE_CLASS,
  renderCompactEventChip,
  renderCompactHebcalChip,
} from './calendarViewShared';

export interface MonthCalendarViewProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  isRtl: boolean;
  days: Array<CalendarDay | null>;
  showEventAges: boolean;
  showFasts: boolean;
  showHolidayEvents: boolean;
  showNationalHolidays: boolean;
  showRoshChodesh: boolean;
  showSpecialShabbat: boolean;
  showWeeklyParsha: boolean;
  showGregorian: boolean;
  isMobileViewport: boolean;
  maxVisibleMonthEvents: number;
  getEventColor: (event: GoogleCalendarEvent) => string;
  handleEventClick: (event: GoogleCalendarEvent) => void;
  handleHebcalDetailsClick: (title: string, details: HebcalDisplayDetail[]) => void;
  handleOverflowDayOpen: (
    dayObj: OverflowDay,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  handleCreateFromDay: (dayObj: OverflowDay) => void;
  isCalendarLoading: boolean;
  emptyStateMessage: string;
  emptyStateAction?: React.ReactNode;
}

interface MonthDayRenderData {
  dayKey: string;
  dayObj: CalendarDay;
  holidayLabel: string;
  parshaLabel: string | null;
  visibleEventCount: number;
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
  showSpecialShabbat,
  showWeeklyParsha,
  showGregorian,
  isMobileViewport,
  maxVisibleMonthEvents,
  getEventColor,
  handleEventClick,
  handleHebcalDetailsClick,
  handleOverflowDayOpen,
  handleCreateFromDay,
  isCalendarLoading,
  emptyStateMessage,
  emptyStateAction,
}: MonthCalendarViewProps) {
  const timeLocale = isRtl ? 'he-IL' : 'en-US';
  const hasVisibleEvents = days.some((dayObj) => dayObj?.events?.length > 0);
  const measurementKey = [
    showEventAges,
    showFasts,
    showHolidayEvents,
    showNationalHolidays,
    showRoshChodesh,
    showSpecialShabbat,
    showWeeklyParsha,
    isMobileViewport,
    isRtl,
  ].join('|');
  const {
    monthEventContentRefs,
    monthEventMeasureRefs,
    moreButtonMeasureRef,
    visibleEventCounts,
  } = useMonthVisibleEventCounts({
    days,
    maxVisibleMonthEvents,
    measurementKey,
  });

  const dayRenderData = useMemo<Array<MonthDayRenderData | null>>(
    () =>
      days.map((dayObj) => {
        if (!dayObj) {
          return null;
        }

        const dayKey = getMonthDayKey(dayObj);
        const parshaLabel =
          showWeeklyParsha && dayObj.isShabbat
            ? getShabbatParshaName(dayObj.gDate, {
                locale: getParshaLocale(isRtl),
              })
            : null;
        const holidayLabel =
          showHolidayEvents ||
          showNationalHolidays ||
          showRoshChodesh ||
          showSpecialShabbat ||
          showFasts
            ? getHolidayLabels(dayObj.gDate, {
                includeFasts: showFasts,
                includeHolidayEvents: showHolidayEvents,
                includeNationalHolidays: showNationalHolidays,
                includeRoshChodesh: showRoshChodesh,
                includeSpecialShabbat: showSpecialShabbat,
                locale: getHolidayLocale(isRtl),
              }).join(' \u05f2²\u05b2· ')
            : '';
        const visibleEventCount = visibleEventCounts[dayKey] ?? maxVisibleMonthEvents;

        return {
          dayKey,
          dayObj,
          holidayLabel,
          parshaLabel,
          visibleEventCount,
        };
      }),
    [
      days,
      isRtl,
      maxVisibleMonthEvents,
      showFasts,
      showHolidayEvents,
      showNationalHolidays,
      showRoshChodesh,
      showSpecialShabbat,
      showWeeklyParsha,
      visibleEventCounts,
    ],
  );

  return (
    <div
      data-testid="month-calendar-view"
      className="relative flex min-h-0 flex-1 flex-col md:h-full"
    >
      <div ref={moreButtonMeasureRef} aria-hidden="true" className={MORE_EVENTS_MEASURE_CLASS}>
        {t('moreEvents', { count: 99 })}
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
          const weekdayLabel = t(`days.${idx}`);
          return (
            <div
              key={idx}
              className={`px-2 py-3 text-center text-[10px] font-bold md:text-xs ${idx === 6 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-300'}`}
            >
              <span className="hidden md:inline">{weekdayLabel}</span>
              <span className="md:hidden">
                {isRtl ? MOBILE_HEBREW_WEEKDAYS[idx] : weekdayLabel.substring(0, 1)}
              </span>
            </div>
          );
        })}
      </div>
      <div
        data-testid="month-calendar-scroll"
        className="relative min-h-0 flex-1 overflow-y-auto pb-14 md:pb-12"
      >
        <div className="grid min-h-full grid-cols-7 auto-rows-[minmax(112px,1fr)] bg-white dark:bg-slate-900 md:auto-rows-[minmax(128px,1fr)]">
          {dayRenderData.map((dayData, index) => (
            <div
              key={index}
              className={`min-h-0 overflow-hidden border-b border-l border-slate-200 transition-colors dark:border-slate-700/60 md:min-h-0 ${!dayData ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900'}`}
            >
              {dayData ? (
                <div
                  data-calendar-day-cell="true"
                  className={`group relative flex h-full min-h-0 flex-col overflow-hidden px-1 py-1 transition-colors hover:bg-slate-50/80 md:px-2 md:py-1.5 dark:hover:bg-slate-800/40 ${dayData.dayObj.isToday ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleCreateFromDay(dayData.dayObj)}
                    className="absolute inset-0 z-0"
                    aria-label={t('createEventOnDay', {
                      hebrewDay: dayData.dayObj.hDayGematriya,
                      gregorianDay: dayData.dayObj.gDay,
                    })}
                  />
                  <div
                    className={`pointer-events-none relative z-10 flex w-full items-start px-0.5 pb-1 md:px-1 ${isRtl ? 'justify-start text-right' : 'justify-start text-left'}`}
                  >
                    <div className="flex w-full min-w-0 flex-col">
                      <div className="flex w-full min-w-0 flex-nowrap items-baseline justify-start gap-px">
                        <span
                          className={`inline-flex shrink-0 items-center px-0 text-[11px] font-bold leading-none md:h-7 md:min-w-7 md:justify-center md:rounded-full md:px-1.5 md:text-sm ${
                            dayData.dayObj.isToday
                              ? 'h-5 min-w-5 justify-center rounded-full bg-[#1a73e8] px-1 text-[10px] text-white shadow-sm md:h-7 md:min-w-7 md:px-1.5 md:text-sm'
                              : 'h-6 justify-start text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {isMobileViewport
                            ? formatMobileHebrewDayLabel(dayData.dayObj.hDayGematriya)
                            : dayData.dayObj.hDayGematriya}
                        </span>
                        {showGregorian ? (
                          <span className="min-w-0 truncate text-[8px] font-medium leading-none text-slate-600 dark:text-slate-300 md:text-[10px]">
                            ({dayData.dayObj.gDay})
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div
                    ref={(node) => {
                      monthEventContentRefs.current[dayData.dayKey] = node;
                    }}
                    className="pointer-events-none relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-hidden px-0 pb-0.5"
                  >
                    <div
                      ref={(node) => {
                        monthEventMeasureRefs.current[dayData.dayKey] = node;
                      }}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 overflow-hidden opacity-0"
                    >
                      <div className={MONTH_EVENT_STACK_CLASS}>
                        {dayData.parshaLabel
                          ? renderCompactHebcalChip({
                              label: dayData.parshaLabel,
                              isRtl,
                              tone: 'amber',
                              measure: true,
                            })
                          : null}
                        {dayData.holidayLabel
                          ? renderCompactHebcalChip({
                              label: dayData.holidayLabel,
                              isRtl,
                              tone: 'rose',
                              measure: true,
                            })
                          : null}
                        {dayData.dayObj.events.map((event, eventIndex) => {
                          const ageSuffix = getEventAgeSuffix(
                            event,
                            dayData.dayObj.hYear,
                            showEventAges,
                          );

                          return renderCompactEventChip({
                            chipLabel: `${event.summary}${ageSuffix}`,
                            eventColor: getEventColor(event),
                            timeLabel: formatEventTimeLabel(event, timeLocale),
                            isRtl,
                            measure: true,
                            chipKey: `measure-${eventIndex}`,
                          });
                        })}
                      </div>
                    </div>
                    <div className={`${MONTH_EVENT_STACK_CLASS} overflow-hidden`}>
                      {dayData.parshaLabel
                        ? renderCompactHebcalChip({
                            label: dayData.parshaLabel,
                            isRtl,
                            tone: 'amber',
                            onClick: () => {
                              const detail = getShabbatParshaDetail(dayData.dayObj.gDate, {
                                locale: getParshaLocale(isRtl),
                              });
                              if (detail) {
                                handleHebcalDetailsClick(t('parshaDetails'), [detail]);
                              }
                            },
                          })
                        : null}
                      {dayData.holidayLabel
                        ? renderCompactHebcalChip({
                            label: dayData.holidayLabel,
                            isRtl,
                            tone: 'rose',
                            onClick: () => {
                              const details = getHolidayDetails(dayData.dayObj.gDate, {
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
                            },
                          })
                        : null}
                      {dayData.dayObj.events
                        .slice(0, dayData.visibleEventCount)
                        .map((event, eventIndex) => {
                          const ageSuffix = getEventAgeSuffix(
                            event,
                            dayData.dayObj.hYear,
                            showEventAges,
                          );

                          return renderCompactEventChip({
                            chipLabel: `${event.summary}${ageSuffix}`,
                            eventColor: getEventColor(event),
                            timeLabel: formatEventTimeLabel(event, timeLocale),
                            isRtl,
                            chipKey: String(eventIndex),
                            onClick: () => handleEventClick(event),
                          });
                        })}
                    </div>
                    {dayData.dayObj.events.length > dayData.visibleEventCount ? (
                      <button
                        data-testid="month-overflow-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOverflowDayOpen(dayData.dayObj, event);
                        }}
                        className={`pointer-events-auto ${MORE_EVENTS_BUTTON_CLASS}`}
                        aria-label={t('moreEvents', {
                          count: dayData.dayObj.events.length - dayData.visibleEventCount,
                        })}
                      >
                        {isMobileViewport
                          ? '...'
                          : t('moreEvents', {
                              count: dayData.dayObj.events.length - dayData.visibleEventCount,
                            })}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
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
