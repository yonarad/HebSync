import { gregorianToHebrew } from '../utils/hebcal';
import { logout } from '../utils/googleApi';
import type {
  CreateHebcalEventOptions,
  FallbackChoice,
  GoogleCalendarEvent,
  PreviewOccurrence,
  SourceDateValidation,
} from '../types/appTypes';

type LoginModalMode = 'upgrade' | 'reauthorize' | 'connect';

type CreateHebcalEventFn = (
  title: string,
  category: string,
  originalHebrewYear: string | number,
  rdateString: string,
  calendarId: string,
  userDescription?: string,
  options?: CreateHebcalEventOptions,
) => Promise<GoogleCalendarEvent>;

interface TargetDateParts {
  targetYear: number;
  targetMonth: string;
  targetDay: number;
}

interface UseAddEventPreviewSubmitParams {
  afterSunset: boolean;
  category: string;
  createHebcalEvent: CreateHebcalEventFn;
  day: number;
  fallback30th: FallbackChoice;
  generateRdates: (
    year: number,
    month: string,
    day: number,
    syncSpan: number,
    fallback: FallbackChoice,
  ) => string;
  getPreviewDates: (
    year: number,
    month: string,
    day: number,
    syncSpan: number,
    fallback: FallbackChoice,
  ) => PreviewOccurrence[];
  gregDate: string;
  hasWriteAccess: boolean;
  isGregorianEntry: boolean;
  isLoading: boolean;
  isRtl: boolean;
  month: string;
  notes: string;
  onComplete?: (() => Promise<void> | void) | null;
  openLoginModal: (mode: LoginModalMode) => void;
  requires30thFallbackDecision: (month: string, day: number) => boolean;
  selectedCalendarIds: string[];
  setFeedbackContext?: (value: 'manualValidation' | 'general' | null) => void;
  setFeedbackMessage?: (value: string | null) => void;
  setFeedbackTone?: (value: 'error' | 'success' | null) => void;
  setIsLoading: (value: boolean) => void;
  setPreviewData: (value: PreviewOccurrence[]) => void;
  setShowPreview: (value: boolean) => void;
  syncSpan: number;
  t: (key: string) => string;
  title: string;
  validateHebrewDateForYear: (
    year: number,
    month: string,
    day: number,
  ) => SourceDateValidation;
  year: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? '');
}

export default function useAddEventPreviewSubmit({
  afterSunset,
  category,
  createHebcalEvent,
  day,
  fallback30th,
  generateRdates,
  getPreviewDates,
  gregDate,
  hasWriteAccess,
  isGregorianEntry,
  isLoading,
  isRtl,
  month,
  notes,
  onComplete,
  openLoginModal,
  requires30thFallbackDecision,
  selectedCalendarIds,
  setFeedbackContext = () => {},
  setFeedbackMessage = () => {},
  setFeedbackTone = () => {},
  setIsLoading,
  setPreviewData,
  setShowPreview,
  syncSpan,
  t,
  title,
  validateHebrewDateForYear,
  year,
}: UseAddEventPreviewSubmitParams) {
  const convertedHDate =
    isGregorianEntry && gregDate
      ? gregorianToHebrew(new Date(gregDate), afterSunset)
      : null;

  const show30thFallback =
    !isGregorianEntry && requires30thFallbackDecision(month, day);
  const sourceDateValidation: SourceDateValidation = !isGregorianEntry
    ? validateHebrewDateForYear(Number.parseInt(year, 10), month, day)
    : { isValid: true };

  const resolveTargetDateParts = (): TargetDateParts | null => {
    if (isGregorianEntry) {
      if (!convertedHDate) return null;
      return {
        targetYear: convertedHDate.getFullYear(),
        targetMonth: convertedHDate.getMonthName(),
        targetDay: convertedHDate.getDate(),
      };
    }

    return {
      targetYear: Number.parseInt(year, 10),
      targetMonth: month,
      targetDay: day,
    };
  };

  const handlePreview = () => {
    setFeedbackContext(null);
    setFeedbackMessage(null);
    setFeedbackTone(null);

    if (!title) {
      setFeedbackContext('manualValidation');
      setFeedbackTone('error');
      setFeedbackMessage(t('errorNoTitle'));
      return;
    }

    if (!isGregorianEntry && !sourceDateValidation.isValid) {
      setFeedbackContext('manualValidation');
      setFeedbackTone('error');
      setFeedbackMessage(
        sourceDateValidation.reason === 'missing_flexible_30th'
          ? isRtl
            ? '\u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05e9\u05e0\u05d1\u05d7\u05e8 \u05dc\u05d0 \u05e7\u05d9\u05d9\u05dd \u05d1\u05e9\u05e0\u05ea \u05d4\u05de\u05e7\u05d5\u05e8. \u05dc\u05f3 \u05d1\u05d7\u05e9\u05d5\u05d5\u05df, \u05dc\u05f3 \u05d1\u05db\u05e1\u05dc\u05d5 \u05d5\u05dc\u05f3 \u05d1\u05d0\u05d3\u05e8 \u05d0\u05f3 \u05e7\u05d9\u05d9\u05de\u05d9\u05dd \u05e8\u05e7 \u05d1\u05d7\u05dc\u05e7 \u05de\u05d4\u05e9\u05e0\u05d9\u05dd.'
            : 'The selected date does not exist in the source year. 30 Cheshvan, 30 Kislev, and 30 Adar I exist only in some years.'
          : isRtl
            ? '\u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05e9\u05e0\u05d1\u05d7\u05e8 \u05dc\u05d0 \u05e7\u05d9\u05d9\u05dd \u05d1\u05e9\u05e0\u05ea \u05d4\u05de\u05e7\u05d5\u05e8 \u05e9\u05e0\u05d1\u05d7\u05e8\u05d4.'
            : 'The selected date does not exist in the selected source year.',
      );
      return;
    }

    if (selectedCalendarIds.length === 0) {
      setFeedbackContext('manualValidation');
      setFeedbackTone('error');
      setFeedbackMessage(t('errorNoCalendar'));
      return;
    }

    const targetParts = resolveTargetDateParts();
    if (!targetParts) return;

    const data = getPreviewDates(
      targetParts.targetYear,
      targetParts.targetMonth,
      targetParts.targetDay,
      syncSpan,
      fallback30th,
    );
    setPreviewData(data);
    setShowPreview(true);
  };

  const submitEvent = async () => {
    if (isLoading) return;

    if (!hasWriteAccess) {
      openLoginModal('upgrade');
      return;
    }

    if (!isGregorianEntry && !sourceDateValidation.isValid) {
      throw new Error(
        isRtl
          ? '\u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05e9\u05e0\u05d1\u05d7\u05e8 \u05d0\u05d9\u05e0\u05d5 \u05e7\u05d9\u05d9\u05dd \u05d1\u05e9\u05e0\u05ea \u05d4\u05de\u05e7\u05d5\u05e8.'
          : 'The selected date does not exist in the source year.',
      );
    }

    setIsLoading(true);
    setFeedbackMessage(null);
    setFeedbackTone(null);

    try {
      const targetParts = resolveTargetDateParts();
      if (!targetParts) {
        throw new Error(isRtl ? '\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d5\u05e2\u05d6\u05d9 \u05dc\u05d0 \u05d7\u05d5\u05e7\u05d9' : 'Invalid Gregorian date');
      }

      const rdateString = generateRdates(
        targetParts.targetYear,
        targetParts.targetMonth,
        targetParts.targetDay,
        syncSpan,
        fallback30th,
      );

      if (!rdateString) {
        throw new Error(
          isRtl
            ? '\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05d4\u05d9\u05d4 \u05dc\u05d7\u05e9\u05d1 \u05ea\u05d0\u05e8\u05d9\u05db\u05d9\u05dd \u05e2\u05d1\u05d5\u05e8 \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2'
            : 'Could not calculate dates for the event',
        );
      }

      if (selectedCalendarIds.length === 0) {
        throw new Error(
          isRtl
            ? '\u05d0\u05e0\u05d0 \u05d1\u05d7\u05e8 \u05dc\u05e4\u05d7\u05d5\u05ea \u05d9\u05d5\u05de\u05df \u05d0\u05d7\u05d3 \u05dc\u05e1\u05e0\u05db\u05e8\u05d5\u05df'
            : 'Please select at least one calendar to sync',
        );
      }

      await Promise.all(
        selectedCalendarIds.map((calendarId) =>
          createHebcalEvent(
            title,
            category,
            targetParts.targetYear,
            rdateString,
            calendarId,
            notes,
            {
              specialDate: requires30thFallbackDecision(
                targetParts.targetMonth,
                targetParts.targetDay,
              )
                ? {
                    monthName: targetParts.targetMonth,
                    day: targetParts.targetDay,
                    fallback: fallback30th,
                  }
                : null,
            },
          ),
        ),
      );

      setFeedbackTone('success');
      setFeedbackMessage(
        isRtl
          ? `\u05d4\u05d0\u05d9\u05e8\u05d5\u05e2 \u05e0\u05d5\u05e6\u05e8 \u05d1\u05d4\u05e6\u05dc\u05d7\u05d4 \u05d5\u05e1\u05d5\u05e0\u05db\u05e8\u05df \u05dc-${selectedCalendarIds.length} \u05d9\u05d5\u05de\u05e0\u05d9\u05dd!`
          : `Event created successfully and synced to ${selectedCalendarIds.length} calendars!`,
      );

      if (onComplete) {
        await onComplete();
      }
    } catch (error: unknown) {
      console.error('Submission error:', error);
      const errorMessage = getErrorMessage(error);

      if (
        errorMessage.includes('401') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('Not authenticated')
      ) {
        logout();
        if (
          window.confirm(
            isRtl
              ? '\u05e4\u05d2 \u05ea\u05d5\u05e7\u05e3 \u05d4\u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea \u05dc\u05d2\u05d5\u05d2\u05dc. \u05d4\u05d0\u05dd \u05d1\u05e8\u05e6\u05d5\u05e0\u05da \u05dc\u05d4\u05ea\u05d7\u05d1\u05e8 \u05de\u05d7\u05d3\u05e9 \u05db\u05d3\u05d9 \u05dc\u05e9\u05de\u05d5\u05e8 \u05d0\u05ea \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2?'
              : 'Your Google session expired. Do you want to reconnect to save the event?',
          )
        ) {
          openLoginModal('reauthorize');
        }
      } else {
        setFeedbackTone('error');
        setFeedbackMessage(
          `${isRtl ? '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05e9\u05de\u05d9\u05e8\u05ea \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2: ' : 'Error saving event: '}${errorMessage}`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    convertedHDate,
    handlePreview,
    show30thFallback,
    sourceDateValidation,
    submitEvent,
  };
}
