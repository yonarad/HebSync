import { ChevronLeft, ChevronRight, LoaderCircle, X } from 'lucide-react';
import { HDate } from '@hebcal/core';

export const MOBILE_HEBREW_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

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
}) {
  return (
    <section className="px-1 py-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className={`flex w-full items-center gap-1.5 md:gap-2.5 ${isRtl ? 'justify-end' : 'justify-start'} md:w-auto`}>
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
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 md:text-xs">
              {gMonthRange} {viewHDate.greg().getFullYear()}
            </p>
          </div>
        </div>

        <div className={`flex w-full flex-wrap items-center gap-2 ${isRtl ? 'justify-end md:justify-start' : 'justify-start md:justify-end'} md:w-auto`}>
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
}) {
  return (
    <>
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
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto bg-white dark:bg-slate-900 md:overflow-hidden">
        {days.map((dayObj, i) => (
          <div key={i} className={`min-h-[112px] border-b border-l border-slate-200 transition-colors dark:border-slate-700/60 md:min-h-0 ${!dayObj ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900'}`}>
            {dayObj && (
              <div className={`flex h-full min-h-0 flex-col overflow-hidden px-1 py-1 md:px-2 md:py-1.5 ${dayObj.isToday ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}>
                <div className={`flex w-full items-start px-0.5 pb-1 md:px-1 ${isRtl ? 'justify-center text-center md:justify-start md:text-right' : 'justify-center text-center md:justify-end md:text-left'}`}>
                  <div className={`flex w-full items-center gap-0 ${isRtl ? 'justify-center md:justify-start' : 'justify-center md:justify-end'}`}>
                    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none md:h-7 md:min-w-7 md:px-1.5 md:text-sm ${
                      dayObj.isToday
                        ? 'bg-[#1a73e8] text-white shadow-sm'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}>
                      {dayObj.hDayGematriya}
                    </span>
                    {showGregorian && (
                      <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 md:text-[10px]">
                        ({dayObj.gDay})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex w-full flex-1 flex-col gap-0.5 overflow-hidden px-0.5 pb-0.5">
                  {dayObj.events.slice(0, maxVisibleMonthEvents).map((event, idx) => {
                    const props = event.extendedProperties?.private || {};
                    const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                    const originalYear = isHebCal ? parseInt(props.originalHebrewYear, 10) : null;
                    const age = (originalYear && dayObj.hYear) ? (dayObj.hYear - originalYear) : 0;
                    const ageSuffix = isHebCal ? ` (${age})` : '';
                    const eventColor = getCalendarColor(event.calendarId);
                    return (
                      <div
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                        className={`group relative w-full flex-none overflow-hidden rounded-md px-2 py-1 text-[10px] font-bold leading-tight transition-all ${
                          isHebCal
                            ? 'cursor-pointer text-white hover:brightness-95'
                            : 'cursor-default bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'
                        }`}
                        style={isHebCal ? { backgroundColor: eventColor } : { borderRight: `3px solid ${eventColor}` }}
                        title={event.summary + ageSuffix}
                      >
                        <div className="truncate">{event.summary}{ageSuffix}</div>
                      </div>
                    );
                  })}
                  {dayObj.events.length > maxVisibleMonthEvents && (
                    <button
                      type="button"
                      onClick={(event) => handleOverflowDayOpen(dayObj, event)}
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
    </>
  );
}

export function ScheduleCalendarView({
  t,
  isRtl,
  showGregorian,
  scheduleDays,
  hMonthNameHebrew,
  getCalendarColor,
  handleEventClick,
  isCalendarLoading,
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-white px-3 py-3 dark:bg-slate-900 md:px-5 md:py-4">
      {isCalendarLoading ? (
        <div className="flex h-full items-center justify-center gap-2 text-sm font-medium text-slate-400 dark:text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>{t('loadingGoogleData')}</span>
        </div>
      ) : scheduleDays.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 dark:text-slate-500">
          {t('noEventsInView')}
        </div>
      ) : (
        <div className="space-y-3">
          {scheduleDays.map((dayObj) => (
            <section
              key={dayObj.gDate.toISOString()}
              className="grid grid-cols-[60px_minmax(0,1fr)] gap-2.5 border-b border-slate-100 pb-3 last:border-b-0 dark:border-slate-800 md:grid-cols-[86px_minmax(0,1fr)] md:gap-4"
            >
              <div className={`pt-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black md:h-10 md:w-10 md:text-base ${dayObj.isToday ? 'bg-[#1a73e8] text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>
                  {dayObj.isToday ? dayObj.gDay : dayObj.hDayGematriya}
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-800 dark:text-slate-100 md:text-[11px]">
                  {t(`days.${dayObj.weekday}`)}
                </div>
                <div className="text-[9px] font-medium text-slate-400 dark:text-slate-500 md:text-[10px]">
                  {showGregorian ? `${dayObj.gMonthLabel} ${dayObj.gDay}` : hMonthNameHebrew}
                </div>
              </div>

              <div className="space-y-1.5">
                {dayObj.events.map((event, idx) => {
                  const props = event.extendedProperties?.private || {};
                  const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                  const originalYear = isHebCal ? parseInt(props.originalHebrewYear, 10) : null;
                  const age = (originalYear && dayObj.hYear) ? (dayObj.hYear - originalYear) : 0;
                  const ageSuffix = isHebCal ? ` (${age})` : '';
                  const eventColor = getCalendarColor(event.calendarId);
                  const start = event.start?.dateTime || event.start?.date;
                  const end = event.end?.dateTime || event.end?.date;
                  const timeLabel = event.start?.dateTime
                    ? `${new Date(start).toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}${end ? ` - ${new Date(end).toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}`
                    : '';

                  return (
                    <button
                      key={`${event.id || event.summary}-${idx}`}
                      type="button"
                      onClick={() => handleEventClick(event)}
                      className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-2 text-right transition-all ${
                        isHebCal
                          ? 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                          : 'border-slate-100 bg-slate-50/80 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/70 dark:hover:bg-slate-800'
                      }`}
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
  );
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
}) {
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
            const originalYear = isHebCal ? parseInt(props.originalHebrewYear, 10) : null;
            const age = (originalYear && overflowDay.hYear) ? (overflowDay.hYear - originalYear) : 0;
            const ageSuffix = isHebCal ? ` (${age})` : '';
            const eventColor = getCalendarColor(event.calendarId);
            const start = event.start?.dateTime || event.start?.date;
            const timeLabel = start && event.start?.dateTime
              ? new Date(start).toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })
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
                style={isHebCal ? { backgroundColor: eventColor } : { borderRight: `4px solid ${eventColor}` }}
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
