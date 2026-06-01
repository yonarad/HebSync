import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  FallbackChoice,
  PreviewOccurrence,
  SourceDateValidation,
} from '../types/appTypes';

const { logoutMock, gregorianToHebrewMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  gregorianToHebrewMock: vi.fn(),
}));

vi.mock('../utils/googleApi', () => ({
  logout: logoutMock,
}));

vi.mock('../utils/hebcal', () => ({
  gregorianToHebrew: gregorianToHebrewMock,
}));

import useAddEventPreviewSubmit from '../hooks/useAddEventPreviewSubmit';

describe('useAddEventPreviewSubmit', () => {
  const previewRows: PreviewOccurrence[] = [
    {
      hebrewYear: 5786,
      hebrewDate: '\u05dc\u05f3 \u05d1\u05d7\u05e9\u05d5\u05d5\u05df',
      gregorianDate: '2026-11-10',
      note: '',
    },
  ];

  const buildParams = () => ({
    afterSunset: false,
    category: 'birthday',
    createHebcalEvent: vi.fn(async () => ({})),
    day: 30,
    fallback30th: '29th' as FallbackChoice,
    generateRdates: vi.fn(() => 'VALUE=DATE:20261110,VALUE=DATE:20271129'),
    getPreviewDates: vi.fn(() => previewRows),
    gregDate: '',
    hasWriteAccess: true,
    isGregorianEntry: false,
    isLoading: false,
    isRtl: false,
    month: 'Cheshvan',
    notes: 'remember candles',
    onComplete: vi.fn(async () => {}),
    openLoginModal: vi.fn(),
    requires30thFallbackDecision: (month: string, day: number) =>
      month === 'Cheshvan' && day === 30,
    selectedCalendarIds: ['cal1', 'cal2'],
    setFeedbackContext: vi.fn(),
    setFeedbackMessage: vi.fn(),
    setFeedbackTone: vi.fn(),
    setIsLoading: vi.fn(),
    setPreviewData: vi.fn(),
    setShowPreview: vi.fn(),
    syncSpan: 2,
    t: (key: string) => key,
    title: 'Birthday',
    validateHebrewDateForYear: (
      year: number,
      month: string,
      day: number,
    ): SourceDateValidation =>
      year === 5784 && month === 'Cheshvan' && day === 30
        ? { isValid: true, reason: 'ok' }
        : { isValid: true, reason: 'ok' },
    year: '5784',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('sets inline feedback when preview is requested without a title', () => {
    const params = {
      ...buildParams(),
      title: '',
    };

    const { result } = renderHook(() => useAddEventPreviewSubmit(params));

    act(() => {
      result.current.handlePreview();
    });

    expect(params.setFeedbackContext).toHaveBeenCalledWith('manualValidation');
    expect(params.setFeedbackTone).toHaveBeenCalledWith('error');
    expect(params.setFeedbackMessage).toHaveBeenCalledWith('errorNoTitle');
    expect(params.setPreviewData).not.toHaveBeenCalled();
    expect(params.setShowPreview).not.toHaveBeenCalled();
  });

  it('builds preview data from a Gregorian date conversion', () => {
    gregorianToHebrewMock.mockReturnValue({
      getFullYear: () => 5786,
      getMonthName: () => 'Kislev',
      getDate: () => 1,
    });

    const params = {
      ...buildParams(),
      gregDate: '2026-11-20',
      isGregorianEntry: true,
    };

    const { result } = renderHook(() => useAddEventPreviewSubmit(params));

    act(() => {
      result.current.handlePreview();
    });

    expect(params.getPreviewDates).toHaveBeenCalledWith(
      5786,
      'Kislev',
      1,
      2,
      '29th',
    );
    expect(params.setPreviewData).toHaveBeenCalledWith(previewRows);
    expect(params.setShowPreview).toHaveBeenCalledWith(true);
  });

  it('submits one event per selected calendar and includes special-date metadata', async () => {
    const params = buildParams();

    const { result } = renderHook(() => useAddEventPreviewSubmit(params));

    await act(async () => {
      await result.current.submitEvent();
    });

    expect(params.setIsLoading).toHaveBeenNthCalledWith(1, true);
    expect(params.createHebcalEvent).toHaveBeenCalledTimes(2);
    expect(params.createHebcalEvent).toHaveBeenNthCalledWith(
      1,
      'Birthday',
      'birthday',
      5784,
      'VALUE=DATE:20261110,VALUE=DATE:20271129',
      'cal1',
      'remember candles',
      {
        specialDate: {
          monthName: 'Cheshvan',
          day: 30,
          fallback: '29th',
        },
      },
    );
    expect(params.onComplete).toHaveBeenCalled();
    expect(params.setFeedbackMessage).toHaveBeenCalledWith(
      'Event created successfully and synced to 2 calendars!',
    );
    expect(params.setFeedbackTone).toHaveBeenCalledWith('success');
    expect(params.setIsLoading).toHaveBeenLastCalledWith(false);
  });

  it('opens the reauthorize flow on authentication failures', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    localStorage.setItem('gcal_token', 'old-token');

    const params = {
      ...buildParams(),
      createHebcalEvent: vi.fn(async () => {
        throw new Error('401 authentication required');
      }),
    };

    const { result } = renderHook(() => useAddEventPreviewSubmit(params));

    await act(async () => {
      await result.current.submitEvent();
    });

    expect(logoutMock).toHaveBeenCalled();
    expect(confirmSpy).toHaveBeenCalled();
    expect(params.openLoginModal).toHaveBeenCalledWith('reauthorize');
    expect(params.setIsLoading).toHaveBeenLastCalledWith(false);
  });
});
