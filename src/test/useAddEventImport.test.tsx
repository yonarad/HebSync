import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAddEventImport from '../hooks/useAddEventImport';
import type { FallbackChoice, SourceDateValidation } from '../types/appTypes';

describe('useAddEventImport', () => {
  const bulkImportColumns = [
    'title',
    'category',
    'notes',
    'sourceYear',
    'month',
    'day',
    'occurrences',
  ];

  const baseParams = () => ({
    bulkImportColumns,
    createHebcalEvent: vi.fn(async () => ({})),
    generateRdates: vi.fn(() => 'VALUE=DATE:20260507'),
    hasWriteAccess: true,
    importCategoryMap: { Birthday: 'birthday' },
    importMonthMap: { Cheshvan: 'Cheshvan' },
    isLoading: false,
    isRtl: false,
    normalizeHebrewToken: (value: unknown) => String(value ?? '').trim(),
    notesDefault: '',
    onComplete: vi.fn(async () => {}),
    openLoginModal: vi.fn(),
    parseDayValue: (value: unknown) => Number(value),
    parseSourceYearValue: (value: unknown) => Number(value),
    requires30thFallbackDecision: (month?: string, day?: number | null) =>
      month === 'Cheshvan' && day === 30,
    selectedCalendarIds: ['cal1'],
    setIsLoading: vi.fn(),
    t: (key: string) => key,
    validateHebrewDateForYear: (year: number, month: string, day: number): SourceDateValidation =>
      year === 5784 && month === 'Cheshvan' && day === 30
        ? { isValid: false, reason: 'missing_flexible_30th', isFlexible30th: true }
        : { isValid: true, reason: 'ok' },
    xlsx: {
      read: vi.fn(() => ({
        SheetNames: ['Events'],
        Sheets: { Events: { __mock: true } },
      })),
      utils: {
        sheet_to_json: vi.fn(),
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('parses import rows that need a fallback decision and enables confirmation after selection', async () => {
    const params = baseParams();
    vi.mocked(params.xlsx.utils.sheet_to_json).mockReturnValue([
      bulkImportColumns,
      ['Birthday Event', 'Birthday', 'note', '5784', 'Cheshvan', '30', '2'],
    ]);

    const file = {
      name: 'events.xlsx',
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
    } as unknown as File;

    const { result } = renderHook(() => useAddEventImport(params));

    act(() => {
      result.current.handleImportFileChange({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.parseImportWorkbook();
    });

    await waitFor(() => {
      expect(result.current.importPreviewRows).toHaveLength(1);
    });

    const [row] = result.current.importPreviewRows;
    expect(row.needsFallbackDecision).toBe(true);
    expect(result.current.getImportRowStatus(row)).toBe('needs_decision');
    expect(result.current.canConfirmImport).toBe(false);

    act(() => {
      result.current.updateImportFallbackSelection(
        row.rowNumber,
        '29th' as FallbackChoice,
      );
    });

    expect(result.current.getImportFallbackSelection(row.rowNumber)).toBe('29th');
    expect(result.current.getImportRowStatus(row)).toBe('valid');
    expect(result.current.canConfirmImport).toBe(true);
  });

  it('opens the upgrade flow instead of importing without write access', async () => {
    const params = {
      ...baseParams(),
      hasWriteAccess: false,
      openLoginModal: vi.fn(),
    };

    const { result } = renderHook(() => useAddEventImport(params));

    await act(async () => {
      await result.current.handleConfirmImport();
    });

    expect(params.openLoginModal).toHaveBeenCalledWith('upgrade');
    expect(params.createHebcalEvent).not.toHaveBeenCalled();
  });

  it('reauthorizes when import hits a 401-style error', async () => {
    const params = {
      ...baseParams(),
      createHebcalEvent: vi.fn(async () => {
        throw new Error('401 unauthorized');
      }),
      openLoginModal: vi.fn(),
    };

    vi.spyOn(window, 'alert').mockImplementation(() => {});
    localStorage.setItem('gcal_token', 'token');

    vi.mocked(params.xlsx.utils.sheet_to_json).mockReturnValue([
      bulkImportColumns,
      ['Birthday Event', 'Birthday', 'note', '5784', 'Cheshvan', '30', '2'],
    ]);

    const file = {
      name: 'events.xlsx',
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
    } as unknown as File;

    const { result } = renderHook(() => useAddEventImport(params));

    act(() => {
      result.current.handleImportFileChange({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.parseImportWorkbook();
    });

    await waitFor(() => {
      expect(result.current.importPreviewRows).toHaveLength(1);
    });

    const [row] = result.current.importPreviewRows;
    act(() => {
      result.current.updateImportFallbackSelection(
        row.rowNumber,
        '29th' as FallbackChoice,
      );
    });

    await act(async () => {
      await result.current.handleConfirmImport();
    });

    expect(params.openLoginModal).toHaveBeenCalledWith('reauthorize');
    expect(localStorage.getItem('gcal_token')).toBeNull();
  });
});
