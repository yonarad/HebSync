import { Bell } from 'lucide-react';
import type { GoogleEventReminder, GoogleEventReminders } from '../types/appTypes';
import {
  getAllDayReminderTimingFromMinutes,
  getReminderSettingsFromGoogleEvent,
} from '../utils/googleCalendarReminders';

interface EventReminderSummaryProps {
  isRtl: boolean;
  reminders?: GoogleEventReminders;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export default function EventReminderSummary({
  isRtl,
  reminders,
  t,
}: EventReminderSummaryProps) {
  const parsedReminder = getReminderSettingsFromGoogleEvent(reminders);
  const { settings } = parsedReminder;
  const overrides = !reminders?.useDefault ? reminders?.overrides || [] : [];

  const formatAllDayTiming = (daysBefore: 1 | 2, hour: number) => {
    const dayLabel = daysBefore === 2
      ? t('reminderTwoDaysBefore', { defaultValue: isRtl ? 'יומיים לפני' : 'Two days before' })
      : t('reminderOneDayBefore', { defaultValue: isRtl ? 'יום לפני' : 'One day before' });
    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
    return t('reminderSummaryCustom', {
      defaultValue: isRtl ? '{{day}} בשעה {{hour}}' : '{{day}} at {{hour}}',
      day: dayLabel,
      hour: hourLabel,
    });
  };

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

  const formatReminderOverride = (override: GoogleEventReminder) => {
    const methodLabel = override.method === 'email'
      ? t('reminderMethodEmail', { defaultValue: isRtl ? 'אימייל' : 'Email' })
      : t('reminderMethodPopup', { defaultValue: isRtl ? 'התראה' : 'Notification' });
    const allDayTiming = getAllDayReminderTimingFromMinutes(override.minutes);
    const timingLabel = allDayTiming
      ? formatAllDayTiming(allDayTiming.daysBefore || 1, allDayTiming.hour ?? 0)
      : formatRelativeTiming(override.minutes);

    return t('reminderSummaryOverride', {
      defaultValue: '{{method}}: {{time}}',
      method: methodLabel,
      time: timingLabel,
    });
  };

  const text = (() => {
    if (settings.mode === 'none') {
      return t('reminderSummaryNone', {
        defaultValue: isRtl ? 'ללא תזכורת' : 'No reminder',
      });
    }

    if (settings.mode === 'custom') {
      return formatAllDayTiming(settings.daysBefore || 1, settings.hour ?? 0);
    }

    return t('reminderSummaryCalendarDefault', {
      defaultValue: isRtl ? 'לפי הגדרת היומן' : 'Calendar default',
    });
  })();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-[#0038A8] dark:text-blue-300" />
        <span className="font-bold text-slate-700 dark:text-slate-100">
          {t('eventReminders', { defaultValue: isRtl ? 'תזכורות' : 'Reminders' })}
        </span>
      </div>
      {overrides.length > 0 ? (
        <ul className="mt-2 space-y-1.5 text-slate-600 dark:text-slate-300">
          {overrides.map((override, index) => (
            <li key={`${override.method}-${override.minutes}-${index}`} className="font-medium">
              {formatReminderOverride(override)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 font-medium text-slate-600 dark:text-slate-300">
          {text}
        </p>
      )}
    </div>
  );
}
