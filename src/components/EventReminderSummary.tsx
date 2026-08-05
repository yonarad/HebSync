import { Bell } from 'lucide-react';
import type { GoogleEventReminders } from '../types/appTypes';
import { getReminderSettingsFromGoogleEvent } from '../utils/googleCalendarReminders';

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

  const text = (() => {
    if (parsedReminder.isUnsupported) {
      return t('reminderSummaryUnsupported', {
        defaultValue: isRtl ? 'תזכורת מותאמת ב-Google Calendar' : 'Custom reminder in Google Calendar',
      });
    }

    if (settings.mode === 'none') {
      return t('reminderSummaryNone', {
        defaultValue: isRtl ? 'ללא תזכורת' : 'No reminder',
      });
    }

    if (settings.mode === 'custom') {
      const dayLabel = settings.daysBefore === 2
        ? t('reminderTwoDaysBefore', { defaultValue: isRtl ? 'יומיים לפני' : 'Two days before' })
        : t('reminderOneDayBefore', { defaultValue: isRtl ? 'יום לפני' : 'One day before' });
      const hourLabel = `${(settings.hour ?? 0).toString().padStart(2, '0')}:00`;
      return t('reminderSummaryCustom', {
        defaultValue: isRtl ? '{{day}} בשעה {{hour}}' : '{{day}} at {{hour}}',
        day: dayLabel,
        hour: hourLabel,
      });
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
      <p className="mt-1.5 font-medium text-slate-600 dark:text-slate-300">
        {text}
      </p>
    </div>
  );
}
