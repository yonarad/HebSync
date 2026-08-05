import { Bell } from 'lucide-react';
import type { EventReminderMode, EventReminderSettings, GoogleEventReminder } from '../types/appTypes';
import { DEFAULT_REMINDER_DAYS_BEFORE, DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_METHOD } from '../utils/googleCalendarReminders';
import EventReminderOverrideList from './EventReminderOverrideList';

interface EventReminderControlsProps {
  calendarDefaultReminders?: GoogleEventReminder[];
  isAllDay?: boolean;
  isRtl: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  value: EventReminderSettings;
  onChange: (settings: EventReminderSettings) => void;
  unsupportedMessage?: string | null;
}

export default function EventReminderControls({
  calendarDefaultReminders,
  isAllDay = false,
  isRtl,
  t,
  value,
  onChange,
  unsupportedMessage = null,
}: EventReminderControlsProps) {
  const mode = value.mode;
  const daysBefore = value.daysBefore || DEFAULT_REMINDER_DAYS_BEFORE;
  const hour = value.hour ?? DEFAULT_REMINDER_HOUR;

  const updateMode = (nextMode: EventReminderMode) => {
    onChange({
      mode: nextMode,
      method: value.method || DEFAULT_REMINDER_METHOD,
      daysBefore,
      hour,
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-[#0038A8]" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {t('eventReminders', { defaultValue: isRtl ? 'תזכורות' : 'Reminders' })}
        </h3>
      </div>
      {unsupportedMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          {unsupportedMessage}
        </p>
      ) : null}
      <div className="grid gap-2 md:grid-cols-3">
        {[
          {
            mode: 'calendar_default' as EventReminderMode,
            label: t('reminderCalendarDefault', { defaultValue: isRtl ? 'לפי הגדרת היומן' : 'Calendar default' }),
          },
          {
            mode: 'none' as EventReminderMode,
            label: t('reminderNone', { defaultValue: isRtl ? 'ללא תזכורת' : 'No reminder' }),
          },
          {
            mode: 'custom' as EventReminderMode,
            label: t('reminderCustom', { defaultValue: isRtl ? 'תזכורת מותאמת' : 'Custom reminder' }),
          },
        ].map((option) => (
          <button
            key={option.mode}
            type="button"
            aria-pressed={mode === option.mode}
            onClick={() => updateMode(option.mode)}
            className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
              mode === option.mode
                ? 'border-[#0038A8] bg-blue-50 text-[#0038A8] dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {mode === 'custom' ? (
        <div className="grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 dark:border-slate-800">
          <div className="space-y-1.5">
            <label htmlFor="event-reminder-days" className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('reminderWhen', { defaultValue: isRtl ? 'מתי' : 'When' })}
            </label>
            <select
              id="event-reminder-days"
              value={daysBefore}
              onChange={(event) =>
                onChange({
                  ...value,
                  mode: 'custom',
                  method: value.method || DEFAULT_REMINDER_METHOD,
                  daysBefore: Number(event.target.value) as 1 | 2,
                  hour,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 outline-none focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value={1}>{t('reminderOneDayBefore', { defaultValue: isRtl ? 'יום לפני' : 'One day before' })}</option>
              <option value={2}>{t('reminderTwoDaysBefore', { defaultValue: isRtl ? 'יומיים לפני' : 'Two days before' })}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event-reminder-hour" className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('reminderHour', { defaultValue: isRtl ? 'שעה' : 'Hour' })}
            </label>
            <select
              id="event-reminder-hour"
              value={hour}
              onChange={(event) =>
                onChange({
                  ...value,
                  mode: 'custom',
                  method: value.method || DEFAULT_REMINDER_METHOD,
                  daysBefore,
                  hour: Number(event.target.value),
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 outline-none focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {Array.from({ length: 24 }, (_, hourValue) => (
                <option key={hourValue} value={hourValue}>
                  {hourValue.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
      {mode === 'calendar_default' && Array.isArray(calendarDefaultReminders) ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            {t('reminderSummaryCalendarDefaultApplied', {
              defaultValue: isRtl ? 'ברירת המחדל של היומן' : 'Calendar default',
            })}
          </p>
          {calendarDefaultReminders.length > 0 ? (
            <div className="mt-2">
              <EventReminderOverrideList
                isAllDay={isAllDay}
                isRtl={isRtl}
                reminders={calendarDefaultReminders}
                t={t}
              />
            </div>
          ) : (
            <p className="mt-1 font-medium text-slate-600 dark:text-slate-300">
              {t('reminderSummaryCalendarDefaultNone', {
                defaultValue: isRtl ? 'לפי הגדרת היומן: ללא תזכורות' : 'Calendar default: no reminders',
              })}
            </p>
          )}
        </div>
      ) : null}
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        {mode === 'custom'
          ? t('reminderCustomHint', { defaultValue: isRtl ? 'התזכורת תישלח כהתראת Google Calendar. אפשר לערוך הגדרות מתקדמות ב-Google לאחר היצירה.' : 'The reminder will be saved as a Google Calendar notification. Advanced settings can be edited in Google after creation.' })
          : t('reminderDefaultHint', { defaultValue: isRtl ? 'בחירה זו לא משנה את הגדרות היומן.' : 'This does not change the calendar settings.' })}
      </p>
    </div>
  );
}
