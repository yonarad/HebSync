import React from 'react';

export const MONTH_EVENT_STACK_CLASS = 'flex min-h-0 w-full flex-col gap-0.5';
export const MONTH_EVENT_TEXT_CLASS = 'text-[10px] font-bold leading-tight';
export const MONTH_TIMED_EVENT_CLASS =
  'rounded-sm px-0.5 py-0.5 text-slate-700 dark:text-slate-100';
export const MONTH_ALL_DAY_EVENT_CLASS = 'rounded-md px-1.5 py-0.5 text-white';
export const MONTH_HEBCAL_CHIP_CLASS =
  'w-full flex-none overflow-hidden rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-tight';
export const MORE_EVENTS_BUTTON_CLASS =
  'block w-full overflow-hidden truncate rounded-sm px-0.5 py-0.5 text-right text-[10px] font-bold leading-tight whitespace-nowrap text-[#1a73e8] translate-y-px hover:underline dark:text-blue-300';
export const MORE_EVENTS_MEASURE_CLASS =
  'pointer-events-none absolute -left-[9999px] top-0 w-full overflow-hidden truncate rounded-sm px-0.5 py-0.5 text-right text-[10px] font-bold leading-tight whitespace-nowrap text-[#1a73e8] translate-y-px';
export const MOBILE_VIEWPORT_BREAKPOINT = 768;

export function renderCompactHebcalChip({
  label,
  isRtl,
  tone,
  onClick,
  title,
  measure = false,
}: {
  label: string;
  isRtl: boolean;
  tone: 'amber' | 'rose';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  measure?: boolean;
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-50/85 text-amber-800 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/60'
      : 'bg-rose-50/85 text-rose-800 ring-1 ring-inset ring-rose-200/70 dark:bg-rose-950/25 dark:text-rose-200 dark:ring-rose-900/60';
  const alignmentClass = isRtl ? 'text-right' : 'text-left';

  if (measure) {
    return (
      <div
        data-month-measure-item="true"
        className={`${MONTH_HEBCAL_CHIP_CLASS} ${toneClass} ${alignmentClass}`}
      >
        <div className="truncate">{label}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="hebcal-chip"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`group relative pointer-events-auto ${MONTH_HEBCAL_CHIP_CLASS} cursor-pointer ${toneClass} transition-all hover:opacity-80 ${alignmentClass}`}
      title={title ?? label}
    >
      <div className="truncate">{label}</div>
    </button>
  );
}

export function renderCompactEventChip({
  chipLabel,
  eventColor,
  timeLabel,
  isRtl,
  onClick,
  measure = false,
  chipKey,
}: {
  chipLabel: string;
  eventColor: string;
  timeLabel: string;
  isRtl: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  measure?: boolean;
  chipKey: string;
}) {
  const isTimedEvent = Boolean(timeLabel);
  const alignmentClass = isRtl ? 'text-right' : 'text-left';
  const content = isTimedEvent ? (
    <div className="flex w-full">
      <div className={`inline-flex min-w-0 items-center gap-1 ${isRtl ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: eventColor }}
        />
        <span className="shrink-0 text-[9px] font-semibold text-slate-600 dark:text-slate-300">
          {timeLabel}
        </span>
        <span className="min-w-0 truncate">{chipLabel}</span>
      </div>
    </div>
  ) : (
    <div className="truncate">{chipLabel}</div>
  );

  if (measure) {
    return (
      <div
        key={chipKey}
        data-month-measure-item="true"
        data-month-measure-event="true"
        className={`w-full flex-none overflow-hidden ${MONTH_EVENT_TEXT_CLASS} ${alignmentClass} ${
          isTimedEvent ? MONTH_TIMED_EVENT_CLASS : MONTH_ALL_DAY_EVENT_CLASS
        }`}
        style={isTimedEvent ? undefined : { backgroundColor: eventColor }}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      key={chipKey}
      type="button"
      data-testid="event-chip"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`group relative pointer-events-auto w-full flex-none cursor-pointer overflow-hidden ${MONTH_EVENT_TEXT_CLASS} transition-all ${alignmentClass} ${
        isTimedEvent
          ? `${MONTH_TIMED_EVENT_CLASS} hover:bg-slate-100/80 dark:hover:bg-slate-800/70`
          : `${MONTH_ALL_DAY_EVENT_CLASS} hover:brightness-95`
      }`}
      style={isTimedEvent ? undefined : { backgroundColor: eventColor }}
      title={timeLabel ? `${chipLabel} ${timeLabel}` : chipLabel}
      aria-label={timeLabel ? `${chipLabel} ${timeLabel}` : chipLabel}
    >
      {content}
    </button>
  );
}
