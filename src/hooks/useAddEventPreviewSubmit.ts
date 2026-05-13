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
    if (!title) {
      window.alert('נא להזין את שם האירוע');
      return;
    }

    if (!isGregorianEntry && !sourceDateValidation.isValid) {
      window.alert(
        sourceDateValidation.reason === 'missing_flexible_30th'
          ? isRtl
            ? 'התאריך שבחרת לא קיים בשנת המקור. ל׳ בחשוון, ל׳ בכסלו ול׳ באדר א׳ קיימים רק בחלק מהשנים.'
            : 'The selected date does not exist in the source year. 30 Cheshvan, 30 Kislev, and 30 Adar I exist only in some years.'
          : isRtl
            ? 'התאריך שבחרת לא קיים בשנת המקור שנבחרה.'
            : 'The selected date does not exist in the selected source year.',
      );
      return;
    }

    if (selectedCalendarIds.length === 0) {
      window.alert(t('errorNoCalendar'));
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
          ? 'התאריך שנבחר אינו קיים בשנת המקור.'
          : 'The selected date does not exist in the source year.',
      );
    }

    setIsLoading(true);

    try {
      const targetParts = resolveTargetDateParts();
      if (!targetParts) {
        throw new Error(isRtl ? 'תאריך לועזי לא חוקי' : 'Invalid Gregorian date');
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
            ? 'לא ניתן היה לחשב תאריכים עבור האירוע'
            : 'Could not calculate dates for the event',
        );
      }

      if (selectedCalendarIds.length === 0) {
        throw new Error(
          isRtl
            ? 'אנא בחר לפחות יומן אחד לסנכרון'
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

      window.alert(
        isRtl
          ? `האירוע נוצר בהצלחה וסונכרן ל-${selectedCalendarIds.length} יומנים!`
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
            'פג תוקף ההתחברות לגוגל. האם ברצונך להתחבר מחדש כדי לשמור את האירוע?',
          )
        ) {
          openLoginModal('reauthorize');
        }
      } else {
        window.alert(
          `${isRtl ? 'שגיאה בשמירת האירוע: ' : 'Error saving event: '}${errorMessage}`,
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
