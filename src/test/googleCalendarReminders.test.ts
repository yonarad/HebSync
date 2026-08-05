import { describe, expect, it } from 'vitest';
import {
  buildGoogleEventReminders,
  getAllDayReminderMinutes,
  getReminderSettingsFromGoogleEvent,
} from '../utils/googleCalendarReminders';

describe('googleCalendarReminders', () => {
  it('calculates all-day reminder minutes from days before and hour', () => {
    expect(getAllDayReminderMinutes(1, 21)).toBe(180);
    expect(getAllDayReminderMinutes(2, 21)).toBe(1620);
    expect(getAllDayReminderMinutes(1, 9)).toBe(900);
  });

  it('builds Google reminder payloads for supported modes', () => {
    expect(buildGoogleEventReminders({ mode: 'calendar_default' })).toEqual({
      useDefault: true,
    });
    expect(buildGoogleEventReminders({ mode: 'none' })).toEqual({
      useDefault: false,
      overrides: [],
    });
    expect(
      buildGoogleEventReminders({
        mode: 'custom',
        method: 'popup',
        daysBefore: 2,
        hour: 21,
      }),
    ).toEqual({
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 1620 }],
    });
  });

  it('rejects unsupported reminder timing values', () => {
    expect(() => getAllDayReminderMinutes(1, -1)).toThrow();
    expect(() => getAllDayReminderMinutes(1, 24)).toThrow();
  });

  it('parses editable Google reminder settings from existing events', () => {
    expect(getReminderSettingsFromGoogleEvent(undefined)).toEqual({
      settings: {
        mode: 'calendar_default',
        method: 'popup',
        daysBefore: 1,
        hour: 21,
      },
      isUnsupported: false,
    });
    expect(getReminderSettingsFromGoogleEvent({ useDefault: false, overrides: [] })).toEqual({
      settings: {
        mode: 'none',
        method: 'popup',
        daysBefore: 1,
        hour: 21,
      },
      isUnsupported: false,
    });
    expect(
      getReminderSettingsFromGoogleEvent({
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 1620 }],
      }),
    ).toEqual({
      settings: {
        mode: 'custom',
        method: 'popup',
        daysBefore: 2,
        hour: 21,
      },
      isUnsupported: false,
    });
  });

  it('marks Google reminder shapes outside HebSync controls as unsupported', () => {
    expect(
      getReminderSettingsFromGoogleEvent({
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 180 },
          { method: 'email', minutes: 1440 },
        ],
      }).isUnsupported,
    ).toBe(true);
    expect(
      getReminderSettingsFromGoogleEvent({
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 5 }],
      }).isUnsupported,
    ).toBe(true);
    expect(
      getReminderSettingsFromGoogleEvent({
        useDefault: false,
        overrides: [{ method: 'email', minutes: 180 }],
      }).isUnsupported,
    ).toBe(true);
  });
});
