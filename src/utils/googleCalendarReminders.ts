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

export interface ParsedGoogleEventReminderSettings {
  settings: EventReminderSettings;
  isUnsupported: boolean;
}

export function areGoogleReminderOverridesEqual(
  first?: GoogleEventReminders['overrides'],
  second?: GoogleEventReminders['overrides'],
): boolean {
  if (!Array.isArray(first) || !Array.isArray(second)) return false;
  if (first.length !== second.length) return false;

  const normalize = (overrides: NonNullable<GoogleEventReminders['overrides']>) =>
    overrides
      .map((override) => `${override.method}:${override.minutes}`)
      .sort();

  const normalizedFirst = normalize(first);
  const normalizedSecond = normalize(second);

  return normalizedFirst.every((override, index) => override === normalizedSecond[index]);
}

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

  if (settings.overrides?.length) {
    return {
      useDefault: false,
      overrides: settings.overrides.map((override) => {
        if (override.method !== 'popup' && override.method !== 'email') {
          throw new Error('Reminder method must be popup or email');
        }

        if (!Number.isInteger(override.minutes) || override.minutes < 0) {
          throw new Error('Reminder minutes must be a non-negative integer');
        }

        return {
          method: override.method,
          minutes: override.minutes,
        };
      }),
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

export function getAllDayReminderTimingFromMinutes(
  minutes: number,
): Pick<EventReminderSettings, 'daysBefore' | 'hour'> | null {
  if (!Number.isInteger(minutes)) return null;

  for (const daysBefore of [1, 2] as const) {
    for (let hour = 0; hour <= 23; hour += 1) {
      if (getAllDayReminderMinutes(daysBefore, hour) === minutes) {
        return { daysBefore, hour };
      }
    }
  }

  return null;
}

export function getReminderSettingsFromGoogleEvent(
  reminders?: GoogleEventReminders,
): ParsedGoogleEventReminderSettings {
  if (!reminders || reminders.useDefault) {
    return {
      settings: DEFAULT_REMINDER_SETTINGS,
      isUnsupported: false,
    };
  }

  const overrides = reminders.overrides || [];
  if (overrides.length === 0) {
    return {
      settings: {
        ...DEFAULT_REMINDER_SETTINGS,
        mode: 'none',
      },
      isUnsupported: false,
    };
  }

  const hasOnlySupportedOverrides = overrides.every((override) =>
    (override.method === 'popup' || override.method === 'email') &&
    Number.isInteger(override.minutes) &&
    override.minutes >= 0
  );
  const parsedOverrideTiming = overrides
    .map((override) => getAllDayReminderTimingFromMinutes(override.minutes));

  if (
    overrides.length > 1 &&
    hasOnlySupportedOverrides &&
    parsedOverrideTiming.every(Boolean)
  ) {
    const firstTiming = parsedOverrideTiming[0];
    return {
      settings: {
        mode: 'custom',
        method: overrides[0].method,
        daysBefore: firstTiming?.daysBefore,
        hour: firstTiming?.hour,
        overrides,
      },
      isUnsupported: false,
    };
  }

  if (overrides.length !== 1) {
    return {
      settings: DEFAULT_REMINDER_SETTINGS,
      isUnsupported: true,
    };
  }

  const [override] = overrides;
  if (override.method !== DEFAULT_REMINDER_METHOD) {
    return {
      settings: DEFAULT_REMINDER_SETTINGS,
      isUnsupported: true,
    };
  }

  const parsedTiming = getAllDayReminderTimingFromMinutes(override.minutes);
  if (!parsedTiming) {
    return {
      settings: DEFAULT_REMINDER_SETTINGS,
      isUnsupported: true,
    };
  }

  return {
    settings: {
      mode: 'custom',
      method: override.method,
      daysBefore: parsedTiming.daysBefore,
      hour: parsedTiming.hour,
    },
    isUnsupported: false,
  };
}
