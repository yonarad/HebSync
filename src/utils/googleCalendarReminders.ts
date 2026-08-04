import type {
  EventReminderSettings,
  GoogleEventReminders,
  GoogleReminderMethod,
} from '../types/appTypes';

export const DEFAULT_REMINDER_METHOD: GoogleReminderMethod = 'popup';
export const DEFAULT_REMINDER_DAYS_BEFORE: 1 | 2 = 1;
export const DEFAULT_REMINDER_HOUR = 21;

export const DEFAULT_REMINDER_SETTINGS: EventReminderSettings = {
  mode: 'calendar_default',
  method: DEFAULT_REMINDER_METHOD,
  daysBefore: DEFAULT_REMINDER_DAYS_BEFORE,
  hour: DEFAULT_REMINDER_HOUR,
};

export function getAllDayReminderMinutes(
  daysBefore: 1 | 2,
  hour: number,
): number {
  if (daysBefore !== 1 && daysBefore !== 2) {
    throw new Error('Reminder day must be one or two days before the event');
  }

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error('Reminder hour must be an integer between 0 and 23');
  }

  return daysBefore * 24 * 60 - hour * 60;
}

export function buildGoogleEventReminders(
  settings: EventReminderSettings = DEFAULT_REMINDER_SETTINGS,
): GoogleEventReminders {
  if (settings.mode === 'none') {
    return {
      useDefault: false,
      overrides: [],
    };
  }

  if (settings.mode !== 'custom') {
    return {
      useDefault: true,
    };
  }

  const method = settings.method || DEFAULT_REMINDER_METHOD;
  const daysBefore = settings.daysBefore || DEFAULT_REMINDER_DAYS_BEFORE;
  const hour = settings.hour ?? DEFAULT_REMINDER_HOUR;
  const minutes = getAllDayReminderMinutes(daysBefore, hour);

  if (method !== 'popup' && method !== 'email') {
    throw new Error('Reminder method must be popup or email');
  }

  return {
    useDefault: false,
    overrides: [
      {
        method,
        minutes,
      },
    ],
  };
}
