import { X } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  getHolidayDetails,
  getHolidayLabels,
  getShabbatParshaDetail,
  getShabbatParshaName,
} from '../utils/hebcal';
import type {
  GoogleCalendarEvent,
  HebcalDisplayDetail,
  OverflowDay,
} from '../types/appTypes';
import {
  formatEventTimeLabel,
  getEventAgeSuffix,
  getHolidayLocale,
  getParshaLocale,
} from './calendarViewUtils';
import {
  MOBILE_VIEWPORT_BREAKPOINT,
  MONTH_EVENT_STACK_CLASS,
  renderCompactEventChip,
  renderCompactHebcalChip,
} from './calendarViewShared';

export interface DayEventsPopoverProps {
  overflowDay: OverflowDay | null;
  isRtl: boolean;
  closeDayEventsLabel: string;
  dayEventsDialogLabel: string;
  holidayDetailsLabel: string;
  parshaDetailsLabel: string;
  overflowPopoverWidth: number;
  overflowPopoverMargin: number;
  overflowPopoverMaxHeight: number;
  overflowTop: number;
  overflowLeft: number;
  showEventAges: boolean;
  showGregorian: boolean;
  showFasts: boolean;
  showHolidayEvents: boolean;
  showNationalHolidays: boolean;
  showRoshChodesh: boolean;
  showSpecialShabbat: boolean;
  showWeeklyParsha: boolean;
  getEventColor: (event: GoogleCalendarEvent) => string;
  setOverflowDay: React.Dispatch<React.SetStateAction<OverflowDay | null>>;
  handleOverflowEventClick: (event: GoogleCalendarEvent) => void;
  handleHebcalDetailsClick: (title: string, details: HebcalDisplayDetail[]) => void;
}

export function DayEventsPopover({
  overflowDay,
  isRtl,
  closeDayEventsLabel,
  dayEventsDialogLabel,
  holidayDetailsLabel,
  parshaDetailsLabel,
  overflowPopoverWidth,
  overflowPopoverMargin,
  overflowPopoverMaxHeight,
  overflowTop,
  overflowLeft,
  showEventAges,
  showGregorian,
  showFasts,
  showHolidayEvents,
  showNationalHolidays,
  showRoshChodesh,
  showSpecialShabbat,
  showWeeklyParsha,
  getEventColor,
  setOverflowDay,
  handleOverflowEventClick,
  handleHebcalDetailsClick,
}: DayEventsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [measuredPosition, setMeasuredPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!overflowDay?.anchorRect || !popoverRef.current || typeof window === 'undefined') {
      setMeasuredPosition(null);
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobileViewport = viewportWidth < MOBILE_VIEWPORT_BREAKPOINT;
    const anchorRect = overflowDay.anchorRect;
    const width = Math.min(overflowPopoverWidth, viewportWidth - overflowPopoverMargin * 2);
    const popoverHeight = Math.min(popoverRef.current.scrollHeight, overflowPopoverMaxHeight);

    const nextLeft = Math.max(
      overflowPopoverMargin,
      Math.min(
        isMobileViewport && isRtl ? anchorRect.right - width : anchorRect.left,
        viewportWidth - width - overflowPopoverMargin,
      ),
    );
    const nextTop =
      anchorRect.top + popoverHeight <= viewportHeight - overflowPopoverMargin
        ? anchorRect.top
        : Math.max(overflowPopoverMargin, anchorRect.bottom - popoverHeight);

    setMeasuredPosition((current) => {
      if (
        current &&
        Math.abs(current.top - nextTop) < 0.5 &&
        Math.abs(current.left - nextLeft) < 0.5
      ) {
        return current;
      }

      return { top: nextTop, left: nextLeft };
    });
  }, [overflowDay, overflowPopoverMargin, overflowPopoverMaxHeight, overflowPopoverWidth, isRtl]);

  if (!overflowDay) return null;

  const popoverParshaLabel =
    showWeeklyParsha && overflowDay.isShabbat
      ? getShabbatParshaName(overflowDay.gDate, {
          locale: getParshaLocale(isRtl),
        })
      : null;
  const popoverHolidayLabel =
    showHolidayEvents || showNationalHolidays || showRoshChodesh || showSpecialShabbat || showFasts
      ? getHolidayLabels(overflowDay.gDate, {
          includeFasts: showFasts,
          includeHolidayEvents: showHolidayEvents,
          includeNationalHolidays: showNationalHolidays,
          includeRoshChodesh: showRoshChodesh,
          includeSpecialShabbat: showSpecialShabbat,
          locale: getHolidayLocale(isRtl),
        }).join(' ֲ· ')
      : '';

  return (
    <div className="fixed inset-0 z-40" dir={isRtl ? 'rtl' : 'ltr'}>
      <button
        type="button"
        aria-label={closeDayEventsLabel}
        onClick={() => setOverflowDay(null)}
        className="absolute inset-0 cursor-default bg-transparent"
      />
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-label={dayEventsDialogLabel}
        data-testid="day-events-popover"
        className="absolute z-10 flex overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{
          width: `${overflowPopoverWidth}px`,
          maxWidth: `calc(100vw - ${overflowPopoverMargin * 2}px)`,
          maxHeight: `${overflowPopoverMaxHeight}px`,
          top: `${measuredPosition?.top ?? overflowTop}px`,
          left: `${measuredPosition?.left ?? overflowLeft}px`,
        }}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-0.5 pt-0.5">
            <div className={MONTH_EVENT_STACK_CLASS}>
              {popoverParshaLabel
                ? renderCompactHebcalChip({
                    label: popoverParshaLabel,
                    isRtl,
                    tone: 'amber',
                    onClick: () => {
                      const detail = getShabbatParshaDetail(overflowDay.gDate, {
                        locale: getParshaLocale(isRtl),
                      });
                      if (detail) {
                        handleHebcalDetailsClick(parshaDetailsLabel, [detail]);
                      }
                    },
                  })
                : null}
              {popoverHolidayLabel
                ? renderCompactHebcalChip({
                    label: popoverHolidayLabel,
                    isRtl,
                    tone: 'rose',
                    onClick: () => {
                      const details = getHolidayDetails(overflowDay.gDate, {
                        includeFasts: showFasts,
                        includeHolidayEvents: showHolidayEvents,
                        includeNationalHolidays: showNationalHolidays,
                        includeRoshChodesh: showRoshChodesh,
                        includeSpecialShabbat: showSpecialShabbat,
                        locale: getHolidayLocale(isRtl),
                      });
                      if (details.length > 0) {
                        handleHebcalDetailsClick(holidayDetailsLabel, details);
                      }
                    },
                  })
                : null}
              {overflowDay.events.map((event, idx) => {
                const ageSuffix = getEventAgeSuffix(event, overflowDay.hYear, showEventAges);
                return renderCompactEventChip({
                  chipLabel: `${event.summary}${ageSuffix}`,
                  eventColor: getEventColor(event),
                  timeLabel: formatEventTimeLabel(event, isRtl ? 'he-IL' : 'en-US'),
                  isRtl,
                  chipKey: `${event.id || event.summary}-${idx}`,
                  onClick: () => handleOverflowEventClick(event),
                });
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
