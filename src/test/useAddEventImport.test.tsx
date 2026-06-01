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
  const bulkImportOptionalColumns = ['dateType', 'gregorianDate', 'sunsetMode'];

  const baseParams = () => ({
    // Keep one mock workbook API instance so the hook and the test configure the same object.
    bulkImportColumns,
    bulkImportOptionalColumns,
    createHebcalEvent: vi.fn(async () => ({})),
    generateRdates: vi.fn(() => 'VALUE=DATE:20260507'),
    hasWriteAccess: true,
    importCategoryMap: { Birthday: 'birthday', birthday: 'birthday' },
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
    loadXlsx: (() => {
      const xlsx = {
        read: vi.fn(() => ({
          SheetNames: ['Events'],
          Sheets: { Events: { __mock: true } },
        })),
        SSF: {
          parse_date_code: vi.fn(),
        },
        utils: {
          sheet_to_json: vi.fn(),
        },
      };

      return vi.fn(async () => xlsx);
    })(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('parses import rows that need a fallback decision and enables confirmation after selection', async () => {
    const params = baseParams();
    const xlsx = await params.loadXlsx();
    vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
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

  it('finds the header row even when an instructions row appears above it', async () => {
    const params = baseParams();
    const xlsx = await params.loadXlsx();
    vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
      ['free text', 'choose from list', 'helper'],
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

    expect(result.current.importPreviewRows[0].rowNumber).toBe(3);
  });

  it('parses Gregorian import rows and converts them to a Hebrew recurring source date', async () => {
    const params = baseParams();
    const xlsx = await params.loadXlsx();
    vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
      [...bulkImportColumns, ...bulkImportOptionalColumns],
      ['Birthday Event', 'Birthday', 'note', '', '', '', '2', 'לועזי', '2026-05-07', 'אחרי השקיעה'],
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

    expect(result.current.importPreviewRows[0]).toMatchObject({
      dateType: 'gregorian',
      gregorianDateLabel: '2026-05-07',
      sunsetModeLabel: 'אחרי השקיעה',
      afterSunset: true,
      sourceYearValue: 5786,
      monthId: 'Iyyar',
      dayValue: 21,
    });
    expect(result.current.canConfirmImport).toBe(true);
  });

  it('accepts English category labels from the workbook', async () => {
    const params = baseParams();
    const xlsx = await params.loadXlsx();
    vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
      bulkImportColumns,
      ['Birthday Event', 'Birthday', 'note', '5784', 'Cheshvan', '29', '2'],
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

    expect(result.current.importPreviewRows[0].issues).toEqual([]);
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

    const xlsx = await params.loadXlsx();
    vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
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

  it('imports Gregorian rows using the converted Hebrew date parts', async () => {
    const params = {
      ...baseParams(),
      createHebcalEvent: vi.fn(async () => ({})),
      generateRdates: vi.fn(() => 'VALUE=DATE:20260508'),
    };

    const xlsx = await params.loadXlsx();
    vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
      [...bulkImportColumns, ...bulkImportOptionalColumns],
      ['Birthday Event', 'Birthday', 'note', '', '', '', '2', 'לועזי', '2026-05-07', 'אחרי השקיעה'],
    ]);

    const file = {
      name: 'events.xlsx',
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
    } as unknown as File;

    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useAddEventImport(params));

    act(() => {
      result.current.handleImportFileChange({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.parseImportWorkbook();
    });

    await act(async () => {
      await result.current.handleConfirmImport();
    });

    expect(params.generateRdates).toHaveBeenCalledWith(5786, 'Iyyar', 21, 2, 'skip');
    expect(params.createHebcalEvent).toHaveBeenCalledWith(
      'Birthday Event',
      'birthday',
      5786,
      'VALUE=DATE:20260508',
      'cal1',
      'note',
      { specialDate: null },
    );
  });
});
