export type ScopeMode = 'app_created' | 'read_only' | 'all_events' | null;

export type CalendarAccessRole = 'owner' | 'writer' | 'reader' | string;

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  accessRole: CalendarAccessRole;
  color?: string;
  colorId?: string;
  backgroundColor?: string;
}

export interface StoredAuthState {
  authenticated: boolean;
  scopeMode: Exclude<ScopeMode, null>;
}

export interface SessionUser {
  authenticated?: boolean;
  scopeMode: ScopeMode;
  user?: {
    csrfToken?: string;
  };
  csrfToken?: string;
}

export type FallbackChoice = '29th' | '1st' | 'skip';

export type ImportRowStatus = 'valid' | 'invalid' | 'needs_decision';

export interface SourceDateValidation {
  isValid: boolean;
  reason?:
    | 'ok'
    | 'invalid_year'
    | 'invalid_day'
    | 'month_not_in_year'
    | 'missing_flexible_30th'
    | 'day_out_of_range'
    | string;
  isLeapYear?: boolean;
  maxDay?: number;
  isFlexible30th?: boolean;
}

export interface ImportPreviewRow {
  displayIndex: number;
  rowNumber: number;
  title: string;
  categoryLabel: string;
  notes: string;
  sourceYearLabel: string;
  sourceYearValue: number | null;
  monthLabel: string;
  monthId?: string;
  dayLabel: string;
  dayValue: number | null;
  occurrences: number | string;
  issues: string[];
  validation: SourceDateValidation | null;
  needsFallbackDecision: boolean;
}

export interface PreviewOccurrence {
  hebrewYear: number;
  hebrewDate: string;
  gregorianDate: string;
  note: string;
}

export interface HebrewMonthOption {
  id: string;
  label: string;
}

export interface AddEventPrefillDate {
  gregorianDate?: string;
  hebrewYear?: string | number;
  hebrewMonth?: string;
  hebrewDay?: string | number;
}

export interface GoogleCalendarDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

export interface GoogleEventPrivateProperties {
  appIdentifier?: string;
  originalHebrewYear?: string;
  eventID?: string;
  category?: string;
  [key: string]: string | undefined;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  start?: GoogleCalendarDateTime;
  end?: GoogleCalendarDateTime;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: GoogleCalendarDateTime;
  calendarId?: string;
  accessRole?: string;
  extendedProperties?: {
    private?: GoogleEventPrivateProperties;
  };
}

export interface MyCalendarEventListItem {
  id?: string;
  calendarId?: string;
  eventID?: string;
  title?: string;
  age: number;
  category?: string;
  date: string;
}

export interface EventSearchParams {
  calendarIds: string[];
  query?: string;
  timeMin?: string;
  timeMax?: string;
  location?: string;
  exclude?: string;
}

export type CalendarViewMode = 'month' | 'schedule';

export interface CalendarDay {
  hDay: number;
  hDayGematriya: string;
  hMonthName: string;
  gDay: number;
  gMonthLabel: string;
  gDate: Date;
  events: GoogleCalendarEvent[];
  hYear: number;
  isToday: boolean;
  isShabbat: boolean;
  weekday: number;
}

export interface OverflowDay extends CalendarDay {
  anchorRect?: {
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
}

export interface HebrewMonthGregorianRange {
  timeMin: string;
  timeMax: string;
}

export interface HebrewMonthMeta {
  hMonthNameEnglish: string;
  hMonthNameHebrew: string;
  hYear: string;
  gMonthRange: string;
}

export interface OverflowPopoverLayout {
  overflowPopoverWidth: number;
  overflowPopoverMargin: number;
  overflowTop: number;
  overflowLeft: number;
}

export interface PendingCalendarCreateState {
  prefillDate?: AddEventPrefillDate | null;
}

export interface GoogleCalendarColorEntry {
  background?: string;
  foreground?: string;
}

export interface GoogleCalendarColors {
  calendar?: Record<string, GoogleCalendarColorEntry>;
  event?: Record<string, GoogleCalendarColorEntry>;
}

export interface SessionResponse {
  authenticated?: boolean;
  user?: SessionUser | null;
}

export interface SpecialDateMetadataInput {
  monthName: string;
  day: number;
  fallback?: FallbackChoice | string | null;
}

export interface CreateHebcalEventOptions {
  specialDate?: SpecialDateMetadataInput | null;
}
