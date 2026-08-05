import type { GoogleEventReminder } from '../types/appTypes';
import { getAllDayReminderTimingFromMinutes } from '../utils/googleCalendarReminders';

interface EventReminderOverrideListProps {
  isAllDay?: boolean;
  isRtl: boolean;
  reminders: GoogleEventReminder[];
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function formatReminderOverride(
  override: GoogleEventReminder,
  {
    isAllDay = false,
    isRtl,
    t,
  }: Omit<EventReminderOverrideListProps, 'reminders'>,
): string {
  const formatRelativeTiming = (minutes: number) => {
    if (minutes === 0) {
      return t('reminderTimingAtEventTime', {
        defaultValue: isRtl ? 'בזמן האירוע' : 'At event time',
      });
    }

    const absMinutes = Math.abs(minutes);
    if (absMinutes % (24 * 60) === 0) {
      const days = absMinutes / (24 * 60);
      return days === 1
        ? t('reminderTimingOneDayBefore', { defaultValue: isRtl ? 'יום לפני' : '1 day before' })
        : t('reminderTimingDaysBefore', { defaultValue: isRtl ? '{{count}} ימים לפני' : '{{count}} days before', count: days });
    }

    if (absMinutes % 60 === 0) {
      const hours = absMinutes / 60;
      return hours === 1
        ? t('reminderTimingOneHourBefore', { defaultValue: isRtl ? 'שעה לפני' : '1 hour before' })
        : t('reminderTimingHoursBefore', { defaultValue: isRtl ? '{{count}} שעות לפני' : '{{count}} hours before', count: hours });
    }

    return absMinutes === 1
      ? t('reminderTimingOneMinuteBefore', { defaultValue: isRtl ? 'דקה לפני' : '1 minute before' })
      : t('reminderTimingMinutesBefore', { defaultValue: isRtl ? '{{count}} דקות לפני' : '{{count}} minutes before', count: absMinutes });
  };

  const methodLabel = override.method === 'email'
    ? t('reminderMethodEmail', { defaultValue: isRtl ? 'אימייל' : 'Email' })
    : t('reminderMethodPopup', { defaultValue: isRtl ? 'התראה' : 'Notification' });
  const allDayTiming = isAllDay ? getAllDayReminderTimingFromMinutes(override.minutes) : null;
  const timingLabel = allDayTiming
    ? formatAllDayReminderTiming(allDayTiming.daysBefore || 1, allDayTiming.hour ?? 0, { isRtl, t })
    : formatRelativeTiming(override.minutes);

  return t('reminderSummaryOverride', {
    defaultValue: '{{method}}: {{time}}',
    method: methodLabel,
    time: timingLabel,
  });
}

export function formatAllDayReminderTiming(
  daysBefore: 1 | 2,
  hour: number,
  {
    isRtl,
    t,
  }: Pick<EventReminderOverrideListProps, 'isRtl' | 't'>,
): string {
  const dayLabel = daysBefore === 2
    ? t('reminderTwoDaysBefore', { defaultValue: isRtl ? 'יומיים לפני' : 'Two days before' })
    : t('reminderOneDayBefore', { defaultValue: isRtl ? 'יום לפני' : 'One day before' });
  const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
  return t('reminderSummaryCustom', {
    defaultValue: isRtl ? '{{day}} בשעה {{hour}}' : '{{day}} at {{hour}}',
    day: dayLabel,
    hour: hourLabel,
  });
}

export default function EventReminderOverrideList({
  isAllDay = false,
  isRtl,
  reminders,
  t,
}: EventReminderOverrideListProps) {
  return (
    <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
      {reminders.map((override, index) => (
        <li key={`${override.method}-${override.minutes}-${index}`} className="font-medium">
          {formatReminderOverride(override, { isAllDay, isRtl, t })}
        </li>
      ))}
    </ul>
  );
}
