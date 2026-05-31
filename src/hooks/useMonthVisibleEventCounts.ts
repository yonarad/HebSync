import { useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import type { CalendarDay } from '../types/appTypes';

function getMonthDayKey(dayObj: CalendarDay): string {
  return `${dayObj.gDate.getFullYear()}-${String(dayObj.gDate.getMonth() + 1).padStart(2, '0')}-${String(dayObj.gDate.getDate()).padStart(2, '0')}`;
}

function areVisibleCountsEqual(
  current: Record<string, number>,
  next: Record<string, number>,
): boolean {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  return nextKeys.every((key) => current[key] === next[key]);
}

interface UseMonthVisibleEventCountsParams {
  days: Array<CalendarDay | null>;
  maxVisibleMonthEvents: number;
  measurementKey: string;
}

interface UseMonthVisibleEventCountsResult {
  monthEventContentRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  monthEventMeasureRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  moreButtonMeasureRef: MutableRefObject<HTMLDivElement | null>;
  visibleEventCounts: Record<string, number>;
}

export function useMonthVisibleEventCounts({
  days,
  maxVisibleMonthEvents,
  measurementKey,
}: UseMonthVisibleEventCountsParams): UseMonthVisibleEventCountsResult {
  const monthEventContentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const monthEventMeasureRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const moreButtonMeasureRef = useRef<HTMLDivElement | null>(null);
  const [visibleEventCounts, setVisibleEventCounts] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const measureVisibleEventCounts = (): void => {
      const moreButtonHeight =
        moreButtonMeasureRef.current?.offsetHeight ||
        moreButtonMeasureRef.current?.getBoundingClientRect().height ||
        16;
      const nextCounts: Record<string, number> = {};

      days.forEach((dayObj) => {
        if (!dayObj) return;

        const dayKey = getMonthDayKey(dayObj);
        const container = monthEventContentRefs.current[dayKey];
        const measureContainer = monthEventMeasureRefs.current[dayKey];
        const measuredItems = measureContainer
          ? Array.from(
              measureContainer.querySelectorAll<HTMLElement>('[data-month-measure-item="true"]'),
            )
          : [];
        const eventItems = measureContainer
          ? Array.from(
              measureContainer.querySelectorAll<HTMLElement>('[data-month-measure-event="true"]'),
            )
          : [];
        const availableHeight = container?.clientHeight ?? 0;

        if (!container || !measureContainer || availableHeight <= 0 || eventItems.length === 0) {
          nextCounts[dayKey] = Math.min(dayObj.events.length, maxVisibleMonthEvents);
          return;
        }

        const lastItemBottom = measuredItems.reduce(
          (maxBottom, item) => Math.max(maxBottom, item.offsetTop + item.offsetHeight),
          0,
        );

        if (lastItemBottom <= 0) {
          nextCounts[dayKey] = Math.min(dayObj.events.length, maxVisibleMonthEvents);
          return;
        }

        if (lastItemBottom <= availableHeight + 0.5) {
          nextCounts[dayKey] = dayObj.events.length;
          return;
        }

        const cutoff = Math.max(0, availableHeight - moreButtonHeight);
        let nextVisibleEventCount = 0;

        eventItems.forEach((item) => {
          const itemBottom = item.offsetTop + item.offsetHeight;
          if (itemBottom <= cutoff + 0.5) {
            nextVisibleEventCount += 1;
          }
        });

        nextCounts[dayKey] = Math.max(0, Math.min(nextVisibleEventCount, dayObj.events.length));
      });

      setVisibleEventCounts((current) =>
        areVisibleCountsEqual(current, nextCounts) ? current : nextCounts,
      );
    };

    const scheduleMeasure = (): void => {
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(measureVisibleEventCounts);
      } else {
        measureVisibleEventCounts();
      }
    };

    const frameId =
      typeof window !== 'undefined'
        ? window.requestAnimationFrame(measureVisibleEventCounts)
        : 0;
    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure();
      });

      Object.values(monthEventContentRefs.current).forEach((node) => {
        if (node) {
          resizeObserver?.observe(node);
        }
      });
      Object.values(monthEventMeasureRefs.current).forEach((node) => {
        if (node) {
          resizeObserver?.observe(node);
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', scheduleMeasure);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener('resize', scheduleMeasure);
      }
      resizeObserver?.disconnect();
    };
  }, [days, maxVisibleMonthEvents, measurementKey]);

  return {
    monthEventContentRefs,
    monthEventMeasureRefs,
    moreButtonMeasureRef,
    visibleEventCounts,
  };
}
