import { useState } from 'react';

import type {
  CreateHebcalEventOptions,
  FallbackChoice,
  GoogleCalendarEvent,
  ImportPreviewRow,
  ImportRowStatus,
  SourceDateValidation,
} from '../types/appTypes';

type LoginModalMode = 'upgrade' | 'reauthorize';

type CreateHebcalEventFn = (
  title: string,
  category: string,
  originalHebrewYear: string | number,
  rdateString: string,
  calendarId: string,
  userDescription?: string,
  options?: CreateHebcalEventOptions,
) => Promise<GoogleCalendarEvent>;

type SheetCell = string | number | null | undefined;
type SheetRow = SheetCell[];

interface XlsxSheet {
  __mock?: boolean;
  [key: string]: unknown;
}

interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XlsxSheet | undefined>;
}

interface XlsxLike {
  read: (buffer: ArrayBuffer, options?: unknown) => XlsxWorkbook;
  utils: {
    sheet_to_json: (
      sheet: XlsxSheet,
      options: {
        header: number;
        defval: string;
        blankrows: boolean;
      },
    ) => SheetRow[];
  };
}

interface UseAddEventImportParams {
  bulkImportColumns: string[];
  createHebcalEvent: CreateHebcalEventFn;
  generateRdates: (
    year: number,
    month: string,
    day: number,
    syncSpan: number,
    fallback: FallbackChoice,
  ) => string;
  hasWriteAccess: boolean;
  importCategoryMap: Record<string, string>;
  importMonthMap: Record<string, string>;
  isLoading: boolean;
  isRtl: boolean;
  normalizeHebrewToken: (value: unknown) => string;
  notesDefault?: string;
  onComplete?: (() => Promise<void> | void) | null;
  openLoginModal: (mode: LoginModalMode) => void;
  parseDayValue: (value: unknown) => number | null;
  parseSourceYearValue: (value: unknown) => number | null;
  requires30thFallbackDecision: (
    month: string | undefined,
    day: number | null,
  ) => boolean;
  selectedCalendarIds: string[];
  setIsLoading: (value: boolean) => void;
  t: (key: string) => string;
  validateHebrewDateForYear: (
    year: number,
    month: string,
    day: number,
  ) => SourceDateValidation;
  xlsx: XlsxLike;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? '');
}

export default function useAddEventImport({
  bulkImportColumns,
  createHebcalEvent,
  generateRdates,
  hasWriteAccess,
  importCategoryMap,
  importMonthMap,
  isLoading,
  isRtl,
  normalizeHebrewToken,
  notesDefault = '',
  onComplete,
  openLoginModal,
  parseDayValue,
  parseSourceYearValue,
  requires30thFallbackDecision,
  selectedCalendarIds,
  setIsLoading,
  t,
  validateHebrewDateForYear,
  xlsx,
}: UseAddEventImportParams) {
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [isImportParsing, setIsImportParsing] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importPreviewError, setImportPreviewError] = useState('');
  const [importFallbackSelections, setImportFallbackSelections] = useState<
    Record<number, FallbackChoice | ''>
  >({});

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    setSelectedImportFile(file ?? null);
    setImportPreviewRows([]);
    setImportPreviewError('');
  };

  const getImportFallbackSelection = (rowNumber: number): FallbackChoice | '' =>
    importFallbackSelections[rowNumber] ?? '';

  const getImportRowStatus = (row: ImportPreviewRow): ImportRowStatus => {
    if (row.needsFallbackDecision && !getImportFallbackSelection(row.rowNumber)) {
      return 'needs_decision';
    }

    return row.issues.length > 0 ? 'invalid' : 'valid';
  };

  const updateImportFallbackSelection = (
    rowNumber: number,
    value: FallbackChoice | '',
  ) => {
    setImportFallbackSelections((prev) => ({
      ...prev,
      [rowNumber]: value,
    }));
  };

  const removeImportPreviewRow = (rowNumber: number) => {
    setImportPreviewRows((prev) =>
      prev
        .filter((row) => row.rowNumber !== rowNumber)
        .map((row, index) => ({ ...row, displayIndex: index + 1 })),
    );
    setImportFallbackSelections((prev) => {
      const next = { ...prev };
      delete next[rowNumber];
      return next;
    });
  };

  const importValidCount = importPreviewRows.filter(
    (row) => getImportRowStatus(row) === 'valid',
  ).length;
  const importNeedsDecisionCount = importPreviewRows.filter(
    (row) => getImportRowStatus(row) === 'needs_decision',
  ).length;
  const importInvalidCount = importPreviewRows.filter(
    (row) => getImportRowStatus(row) === 'invalid',
  ).length;
  const importExecutableRows = importPreviewRows.filter(
    (row) => getImportRowStatus(row) === 'valid',
  );
  const canConfirmImport =
    importPreviewRows.length > 0 &&
    importInvalidCount === 0 &&
    importNeedsDecisionCount === 0 &&
    importExecutableRows.length > 0 &&
    selectedCalendarIds.length > 0;

  const parseImportWorkbook = async () => {
    if (!selectedImportFile) {
      setImportPreviewError(
        isRtl
          ? 'יש לבחור קובץ Excel לפני התצוגה המקדימה.'
          : 'Select an Excel file first.',
      );
      return;
    }

    setIsImportParsing(true);
    setImportPreviewError('');

    try {
      const buffer = await selectedImportFile.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];

      if (!firstSheet) {
        throw new Error(
          isRtl
            ? 'לא נמצא גיליון ראשון בקובץ.'
            : 'No first sheet was found in the workbook.',
        );
      }

      const rows = xlsx.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      const [headerRow = []] = rows;
      const normalizedHeaders = headerRow.map(normalizeHebrewToken);
      const missingColumns = bulkImportColumns.filter(
        (column) => !normalizedHeaders.includes(column),
      );

      if (missingColumns.length > 0) {
        throw new Error(
          isRtl
            ? `חסרות עמודות חובה בגיליון Events: ${missingColumns.join(', ')}`
            : `Missing required columns in Events sheet: ${missingColumns.join(', ')}`,
        );
      }

      const headerIndexMap = Object.fromEntries(
        bulkImportColumns.map((column) => [column, normalizedHeaders.indexOf(column)]),
      ) as Record<string, number>;
      const [
        titleColumn,
        categoryColumn,
        notesColumn,
        sourceYearColumn,
        monthColumn,
        dayColumn,
        occurrencesColumn,
      ] = bulkImportColumns;

      const parsedRows = rows
        .slice(1)
        .map((row, rowIndex): ImportPreviewRow | null => {
          const titleValue = normalizeHebrewToken(row[headerIndexMap[titleColumn]]);
          const categoryLabel = normalizeHebrewToken(
            row[headerIndexMap[categoryColumn]],
          );
          const notesValue = normalizeHebrewToken(row[headerIndexMap[notesColumn]]);
          const sourceYearLabel = normalizeHebrewToken(
            row[headerIndexMap[sourceYearColumn]],
          );
          const monthLabel = normalizeHebrewToken(row[headerIndexMap[monthColumn]]);
          const dayLabel = normalizeHebrewToken(row[headerIndexMap[dayColumn]]);
          const occurrencesValue = row[headerIndexMap[occurrencesColumn]];

          if (
            ![
              titleValue,
              categoryLabel,
              notesValue,
              sourceYearLabel,
              monthLabel,
              dayLabel,
              occurrencesValue,
            ].some((value) => String(value ?? '').trim() !== '')
          ) {
            return null;
          }

          const sourceYearValue = parseSourceYearValue(sourceYearLabel);
          const dayValue = parseDayValue(dayLabel);
          const monthId = importMonthMap[monthLabel];
          const categoryId = importCategoryMap[categoryLabel];
          const occurrencesNumber = Number(occurrencesValue);

          const issues: string[] = [];
          if (!titleValue) issues.push(isRtl ? 'חסר שם אירוע' : 'Missing event title');
          if (!categoryId) issues.push(isRtl ? 'קטגוריה לא מזוהה' : 'Unknown category');
          if (!sourceYearValue) issues.push(isRtl ? 'שנת מקור לא תקינה' : 'Invalid source year');
          if (!monthId) issues.push(isRtl ? 'חודש לא מזוהה' : 'Unknown month');
          if (!dayValue) issues.push(isRtl ? 'יום לא תקין' : 'Invalid day');
          if (!Number.isFinite(occurrencesNumber) || occurrencesNumber < 1) {
            issues.push(
              isRtl ? 'מספר מופעים לא תקין' : 'Invalid occurrences count',
            );
          }

          const validation: SourceDateValidation | null =
            sourceYearValue && monthId && dayValue
              ? validateHebrewDateForYear(sourceYearValue, monthId, dayValue)
              : null;
          const canResolveWithFallback =
            validation &&
            (validation.reason === 'ok' ||
              validation.reason === 'missing_flexible_30th');
          const needsFallbackDecision =
            requires30thFallbackDecision(monthId, dayValue) && canResolveWithFallback;

          if (validation && !validation.isValid) {
            if (validation.reason !== 'missing_flexible_30th') {
              issues.push(
                isRtl
                  ? 'התאריך לא קיים בשנת המקור'
                  : 'Date does not exist in source year',
              );
            }
          }

          return {
            displayIndex: rowIndex + 1,
            rowNumber: rowIndex + 2,
            title: titleValue,
            categoryLabel,
            notes: notesValue || notesDefault,
            sourceYearLabel,
            sourceYearValue,
            monthLabel,
            monthId,
            dayLabel,
            dayValue,
            occurrences: Number.isFinite(occurrencesNumber)
              ? occurrencesNumber
              : String(occurrencesValue ?? ''),
            issues,
            validation,
            needsFallbackDecision,
          };
        })
        .filter((row): row is ImportPreviewRow => row !== null);

      setImportPreviewRows(parsedRows);
      setImportFallbackSelections({});

      if (parsedRows.length === 0) {
        setImportPreviewError(
          isRtl
            ? 'לא נמצאו שורות אירועים בגיליון Events.'
            : 'No event rows were found in the Events sheet.',
        );
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setImportPreviewRows([]);
      setImportPreviewError(
        errorMessage || (isRtl ? 'קריאת הקובץ נכשלה.' : 'Failed to read workbook.'),
      );
    } finally {
      setIsImportParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (isLoading) return;

    if (!hasWriteAccess) {
      openLoginModal('upgrade');
      return;
    }

    if (selectedCalendarIds.length === 0) {
      window.alert(t('errorNoCalendar'));
      return;
    }

    if (importExecutableRows.length === 0) {
      window.alert(
        isRtl
          ? 'אין שורות מוכנות לייבוא.'
          : 'There are no rows ready to import.',
      );
      return;
    }

    setIsLoading(true);
    try {
      let createdCount = 0;
      let skippedCount = 0;
      const failedRows: number[] = [];

      for (const row of importExecutableRows) {
        const fallback: FallbackChoice = row.needsFallbackDecision
          ? importFallbackSelections[row.rowNumber] || '29th'
          : 'skip';

        const rdateString = generateRdates(
          row.sourceYearValue as number,
          row.monthId as string,
          row.dayValue as number,
          Number(row.occurrences) || 1,
          fallback,
        );

        if (!rdateString) {
          skippedCount += 1;
          continue;
        }

        try {
          await Promise.all(
            selectedCalendarIds.map((calendarId) =>
              createHebcalEvent(
                row.title,
                importCategoryMap[row.categoryLabel] ?? 'other',
                row.sourceYearValue as number,
                rdateString,
                calendarId,
                row.notes,
                {
                  specialDate: requires30thFallbackDecision(
                    row.monthId,
                    row.dayValue,
                  )
                    ? {
                        monthName: row.monthId as string,
                        day: row.dayValue as number,
                        fallback,
                      }
                    : null,
                },
              ),
            ),
          );
          createdCount += 1;
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          if (
            errorMessage.includes('401') ||
            errorMessage.includes('authentication') ||
            errorMessage.includes('Not authenticated')
          ) {
            throw error;
          }
          failedRows.push(row.displayIndex);
        }
      }

      const summaryParts = [
        isRtl ? `נוצרו: ${createdCount}` : `Created: ${createdCount}`,
        isRtl ? `דולגו: ${skippedCount}` : `Skipped: ${skippedCount}`,
      ];

      if (failedRows.length > 0) {
        summaryParts.push(
          isRtl
            ? `נכשלו בשורות: ${failedRows.join(', ')}`
            : `Failed rows: ${failedRows.join(', ')}`,
        );
      }

      window.alert(summaryParts.join(' | '));

      if (createdCount > 0 && onComplete) {
        await onComplete();
      }
    } catch (error: unknown) {
      console.error('Bulk import error:', error);
      const errorMessage = getErrorMessage(error);
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('Not authenticated')
      ) {
        localStorage.removeItem('gcal_token');
        openLoginModal('reauthorize');
      } else {
        window.alert(
          (isRtl ? 'שגיאה בייבוא: ' : 'Import error: ') + errorMessage,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    canConfirmImport,
    getImportFallbackSelection,
    getImportRowStatus,
    handleConfirmImport,
    handleImportFileChange,
    importExecutableRows,
    importFallbackSelections,
    importInvalidCount,
    importNeedsDecisionCount,
    importPreviewError,
    importPreviewRows,
    importValidCount,
    isImportParsing,
    parseImportWorkbook,
    removeImportPreviewRow,
    selectedImportFile,
    updateImportFallbackSelection,
  };
}
