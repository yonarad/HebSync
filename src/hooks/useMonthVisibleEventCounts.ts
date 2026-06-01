import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
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
  const scheduledFrameRef = useRef<number | null>(null);
  const [visibleEventCounts, setVisibleEventCounts] = useState<Record<string, number>>({});
  const dayMeasurementSignature = useMemo(
    () =>
      days
        .map((dayObj) => {
          if (!dayObj) {
            return 'empty';
          }

          return [
            getMonthDayKey(dayObj),
            dayObj.isShabbat ? 'shabbat' : 'weekday',
            dayObj.events
              .map((event) =>
                [
                  event.id || '',
                  event.summary || '',
                  event.start?.date || '',
                  event.start?.dateTime || '',
                ].join('~'),
              )
              .join(','),
          ].join(':');
        })
        .join('|'),
    [days],
  );

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
        if (scheduledFrameRef.current !== null) {
          window.cancelAnimationFrame(scheduledFrameRef.current);
        }
        scheduledFrameRef.current = window.requestAnimationFrame(() => {
          scheduledFrameRef.current = null;
          measureVisibleEventCounts();
        });
      } else {
        measureVisibleEventCounts();
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    const activeDayKeys = new Set<string>();

    days.forEach((dayObj) => {
      if (!dayObj) {
        return;
      }

      activeDayKeys.add(getMonthDayKey(dayObj));
    });

    Object.keys(monthEventContentRefs.current).forEach((dayKey) => {
      if (!activeDayKeys.has(dayKey)) {
        delete monthEventContentRefs.current[dayKey];
      }
    });
    Object.keys(monthEventMeasureRefs.current).forEach((dayKey) => {
      if (!activeDayKeys.has(dayKey)) {
        delete monthEventMeasureRefs.current[dayKey];
      }
    });

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure();
      });

      Object.values(monthEventContentRefs.current).forEach((node) => {
        if (node) {
          resizeObserver?.observe(node);
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', scheduleMeasure);
    }

    scheduleMeasure();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', scheduleMeasure);
        if (scheduledFrameRef.current !== null) {
          window.cancelAnimationFrame(scheduledFrameRef.current);
          scheduledFrameRef.current = null;
        }
      }
      resizeObserver?.disconnect();
    };
  }, [dayMeasurementSignature, days, maxVisibleMonthEvents, measurementKey]);

  return {
    monthEventContentRefs,
    monthEventMeasureRefs,
    moreButtonMeasureRef,
    visibleEventCounts,
  };
}
