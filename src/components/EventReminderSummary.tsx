import { Bell } from 'lucide-react';
import type { GoogleEventReminder, GoogleEventReminders } from '../types/appTypes';
import EventReminderOverrideList, { formatAllDayReminderTiming } from './EventReminderOverrideList';
import { getReminderSettingsFromGoogleEvent } from '../utils/googleCalendarReminders';

interface EventReminderSummaryProps {
  calendarDefaultReminders?: GoogleEventReminder[];
  isAllDay?: boolean;
  isRtl: boolean;
  reminders?: GoogleEventReminders;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export default function EventReminderSummary({
  calendarDefaultReminders,
  isAllDay = false,
  isRtl,
  reminders,
  t,
}: EventReminderSummaryProps) {
  const parsedReminder = getReminderSettingsFromGoogleEvent(reminders);
  const { settings } = parsedReminder;
  const overrides = !reminders?.useDefault ? reminders?.overrides || [] : [];
  const usesCalendarDefault = reminders?.useDefault !== false;
  const hasCalendarDefaultReminders = Array.isArray(calendarDefaultReminders);
  const displayedOverrides = overrides.length > 0
    ? overrides
    : usesCalendarDefault && calendarDefaultReminders
      ? calendarDefaultReminders
      : [];
  const isShowingCalendarDefaults = usesCalendarDefault && overrides.length === 0 && displayedOverrides.length > 0;

  const text = (() => {
    if (settings.mode === 'none') {
      return t('reminderSummaryNone', {
        defaultValue: isRtl ? 'ללא תזכורת' : 'No reminder',
      });
    }

    if (usesCalendarDefault && hasCalendarDefaultReminders && displayedOverrides.length === 0) {
      return t('reminderSummaryCalendarDefaultNone', {
        defaultValue: isRtl ? 'לפי הגדרת היומן: ללא תזכורות' : 'Calendar default: no reminders',
      });
    }

    if (settings.mode === 'custom') {
      return formatAllDayReminderTiming(settings.daysBefore || 1, settings.hour ?? 0, { isRtl, t });
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
      {isShowingCalendarDefaults ? (
        <p className="mt-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
          {t('reminderSummaryCalendarDefaultApplied', {
            defaultValue: isRtl ? 'ברירת המחדל של היומן' : 'Calendar default',
          })}
        </p>
      ) : null}
      {displayedOverrides.length > 0 ? (
        <div className="mt-2">
          <EventReminderOverrideList
            isAllDay={isAllDay}
            isRtl={isRtl}
            reminders={displayedOverrides}
            t={t}
          />
        </div>
      ) : (
        <p className="mt-1.5 font-medium text-slate-600 dark:text-slate-300">
          {text}
        </p>
      )}
    </div>
  );
}
