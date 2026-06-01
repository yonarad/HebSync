import { useState } from 'react';
import {
  formatHebrewYear,
  gematriya,
  gregorianToHebrew,
  HEBREW_MONTHS,
} from '../utils/hebcal';

import type {
  CreateHebcalEventOptions,
  FallbackChoice,
  GoogleCalendarEvent,
  ImportDateType,
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
  SSF?: {
    parse_date_code?: (value: number) => {
      y?: number;
      m?: number;
      d?: number;
    } | null;
  };
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
  bulkImportOptionalColumns?: string[];
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
  loadXlsx: () => Promise<XlsxLike>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? '');
}

function buildIsoDateString(
  year: number,
  month: number,
  day: number,
): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export default function useAddEventImport({
  bulkImportColumns,
  bulkImportOptionalColumns = [],
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
  loadXlsx,
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
          ? '\u05d9\u05e9 \u05dc\u05d1\u05d7\u05d5\u05e8 \u05e7\u05d5\u05d1\u05e5 Excel \u05dc\u05e4\u05e0\u05d9 \u05d4\u05ea\u05e6\u05d5\u05d2\u05d4 \u05d4\u05de\u05e7\u05d3\u05d9\u05de\u05d4.'
          : 'Select an Excel file first.',
      );
      return;
    }

    setIsImportParsing(true);
    setImportPreviewError('');

    try {
      const buffer = await selectedImportFile.arrayBuffer();
      const xlsx = await loadXlsx();
      const workbook = xlsx.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];

      if (!firstSheet) {
        throw new Error(
          isRtl
            ? '\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0 \u05d2\u05d9\u05dc\u05d9\u05d5\u05df \u05e8\u05d0\u05e9\u05d5\u05df \u05d1\u05e7\u05d5\u05d1\u05e5.'
            : 'No first sheet was found in the workbook.',
        );
      }

      const rows = xlsx.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      const candidateHeaderRows = rows.slice(0, Math.min(rows.length, 6));
      const headerRowIndex = candidateHeaderRows.findIndex((candidateRow) => {
        const normalizedCandidateHeaders = candidateRow.map(normalizeHebrewToken);
        return bulkImportColumns.every((column) =>
          normalizedCandidateHeaders.includes(column),
        );
      });

      if (headerRowIndex < 0) {
        throw new Error(
          isRtl
            ? `\u05d7\u05e1\u05e8\u05d5\u05ea \u05e2\u05de\u05d5\u05d3\u05d5\u05ea \u05d7\u05d5\u05d1\u05d4 \u05d1\u05d2\u05d9\u05dc\u05d9\u05d5\u05df Events: ${bulkImportColumns.join(', ')}`
            : `Missing required columns in Events sheet: ${bulkImportColumns.join(', ')}`,
        );
      }

      const headerRow = rows[headerRowIndex] ?? [];
      const normalizedHeaders = headerRow.map(normalizeHebrewToken);
      const missingColumns = bulkImportColumns.filter(
        (column) => !normalizedHeaders.includes(column),
      );

      if (missingColumns.length > 0) {
        throw new Error(
          isRtl
            ? `\u05d7\u05e1\u05e8\u05d5\u05ea \u05e2\u05de\u05d5\u05d3\u05d5\u05ea \u05d7\u05d5\u05d1\u05d4 \u05d1\u05d2\u05d9\u05dc\u05d9\u05d5\u05df Events: ${missingColumns.join(', ')}`
            : `Missing required columns in Events sheet: ${missingColumns.join(', ')}`,
        );
      }

      const headerIndexMap = Object.fromEntries(
        [...bulkImportColumns, ...bulkImportOptionalColumns].map((column) => [
          column,
          normalizedHeaders.indexOf(column),
        ]),
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
      const [dateTypeColumn, gregorianDateColumn, sunsetModeColumn] =
        bulkImportOptionalColumns;

      const parseGregorianDateValue = (
        value: SheetCell,
        xlsxModule: XlsxLike,
      ): string | null => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          const parsedDate = xlsxModule.SSF?.parse_date_code?.(value);
          if (!parsedDate?.y || !parsedDate?.m || !parsedDate?.d) {
            return null;
          }

          return buildIsoDateString(parsedDate.y, parsedDate.m, parsedDate.d);
        }

        const normalized = normalizeHebrewToken(value);
        if (!normalized) return null;

        const slashMatch = normalized.match(/^(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{1,4})$/);
        if (slashMatch) {
          const [, first, second, third] = slashMatch;
          const firstNumber = Number(first);
          const secondNumber = Number(second);
          const thirdNumber = Number(third);

          if (first.length === 4) {
            return buildIsoDateString(firstNumber, secondNumber, thirdNumber);
          }

          if (third.length === 4) {
            return buildIsoDateString(thirdNumber, secondNumber, firstNumber);
          }
        }

        const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!isoMatch) {
          return null;
        }

        return buildIsoDateString(
          Number(isoMatch[1]),
          Number(isoMatch[2]),
          Number(isoMatch[3]),
        );
      };

      const parseDateType = (value: SheetCell): ImportDateType => {
        const normalized = normalizeHebrewToken(value).toLowerCase();
        if (
          normalized === 'לועזי' ||
          normalized === 'gregorian' ||
          normalized === 'gregorian date'
        ) {
          return 'gregorian';
        }

        return 'hebrew';
      };

      const parseAfterSunset = (
        value: SheetCell,
      ): {
        afterSunset: boolean;
        label: string;
        isValid: boolean;
      } => {
        const normalized = normalizeHebrewToken(value).toLowerCase();
        if (!normalized) {
          return { afterSunset: false, label: '', isValid: true };
        }

        if (
          normalized === 'אחרי השקיעה' ||
          normalized === 'after sunset'
        ) {
          return { afterSunset: true, label: normalizeHebrewToken(value), isValid: true };
        }

        if (
          normalized === 'לפני השקיעה' ||
          normalized === 'before sunset'
        ) {
          return { afterSunset: false, label: normalizeHebrewToken(value), isValid: true };
        }

        return { afterSunset: false, label: normalizeHebrewToken(value), isValid: false };
      };

      const parsedRows = rows
        .slice(headerRowIndex + 1)
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
          const dateType = parseDateType(
            dateTypeColumn ? row[headerIndexMap[dateTypeColumn]] : '',
          );
          const gregorianDateLabel = gregorianDateColumn
            ? normalizeHebrewToken(row[headerIndexMap[gregorianDateColumn]])
            : '';
          const gregorianDateValue = gregorianDateColumn
            ? parseGregorianDateValue(row[headerIndexMap[gregorianDateColumn]], xlsx)
            : null;
          const sunsetModeValue = sunsetModeColumn
            ? row[headerIndexMap[sunsetModeColumn]]
            : '';
          const sunsetMode = parseAfterSunset(sunsetModeValue);

          if (
            ![
              titleValue,
              categoryLabel,
              notesValue,
              sourceYearLabel,
              monthLabel,
              dayLabel,
              occurrencesValue,
              gregorianDateLabel,
              dateTypeColumn ? row[headerIndexMap[dateTypeColumn]] : '',
              sunsetMode.label,
            ].some((value) => String(value ?? '').trim() !== '')
          ) {
            return null;
          }

          const sourceYearValue =
            dateType === 'hebrew' ? parseSourceYearValue(sourceYearLabel) : null;
          const dayValue = dateType === 'hebrew' ? parseDayValue(dayLabel) : null;
          const monthId = dateType === 'hebrew' ? importMonthMap[monthLabel] : undefined;
          const categoryId =
            importCategoryMap[categoryLabel] ??
            importCategoryMap[categoryLabel.toLowerCase()];
          const occurrencesNumber = Number(occurrencesValue);

          const issues: string[] = [];
          if (!titleValue) issues.push(isRtl ? '\u05d7\u05e1\u05e8 \u05e9\u05dd \u05d0\u05d9\u05e8\u05d5\u05e2' : 'Missing event title');
          if (!categoryId) issues.push(isRtl ? '\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d4 \u05dc\u05d0 \u05de\u05d6\u05d5\u05d4\u05d4' : 'Unknown category');
          if (!Number.isFinite(occurrencesNumber) || occurrencesNumber < 1) {
            issues.push(
              isRtl ? '\u05de\u05e1\u05e4\u05e8 \u05de\u05d5\u05e4\u05e2\u05d9\u05dd \u05dc\u05d0 \u05ea\u05e7\u05d9\u05df' : 'Invalid occurrences count',
            );
          }

          if (dateType === 'hebrew') {
            if (!sourceYearValue) issues.push(isRtl ? '\u05e9\u05e0\u05ea \u05de\u05e7\u05d5\u05e8 \u05dc\u05d0 \u05ea\u05e7\u05d9\u05e0\u05d4' : 'Invalid source year');
            if (!monthId) issues.push(isRtl ? '\u05d7\u05d5\u05d3\u05e9 \u05dc\u05d0 \u05de\u05d6\u05d5\u05d4\u05d4' : 'Unknown month');
            if (!dayValue) issues.push(isRtl ? '\u05d9\u05d5\u05dd \u05dc\u05d0 \u05ea\u05e7\u05d9\u05df' : 'Invalid day');
          } else {
            if (!gregorianDateValue) {
              issues.push(
                isRtl
                  ? '\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d5\u05e2\u05d6\u05d9 \u05dc\u05d0 \u05ea\u05e7\u05d9\u05df'
                  : 'Invalid Gregorian date',
              );
            }
            if (sunsetMode.label && !sunsetMode.isValid) {
              issues.push(
                isRtl
                  ? '\u05e2\u05e8\u05da \u05dc\u05e4\u05e0\u05d9/\u05d0\u05d7\u05e8\u05d9 \u05d4\u05e9\u05e7\u05d9\u05e2\u05d4 \u05dc\u05d0 \u05ea\u05e7\u05d9\u05df'
                  : 'Invalid before/after sunset value',
              );
            }
          }

          const convertedHDate =
            dateType === 'gregorian' && gregorianDateValue
              ? gregorianToHebrew(new Date(gregorianDateValue), sunsetMode.afterSunset)
              : null;
          const derivedSourceYearValue = convertedHDate?.getFullYear() ?? null;
          const derivedMonthId = convertedHDate?.getMonthName();
          const derivedDayValue = convertedHDate?.getDate() ?? null;
          const derivedMonthLabel = convertedHDate
            ? HEBREW_MONTHS.find((monthOption) => monthOption.id === derivedMonthId)?.label ?? derivedMonthId ?? ''
            : '';
          const derivedDayLabel = convertedHDate
            ? gematriya(derivedDayValue ?? '')
            : '';
          const validation: SourceDateValidation | null =
            dateType === 'hebrew'
              ? sourceYearValue && monthId && dayValue
                ? validateHebrewDateForYear(sourceYearValue, monthId, dayValue)
                : null
              : derivedSourceYearValue && derivedMonthId && derivedDayValue
                ? validateHebrewDateForYear(
                    derivedSourceYearValue,
                    derivedMonthId,
                    derivedDayValue,
                  )
                : null;
          const canResolveWithFallback =
            validation &&
            (validation.reason === 'ok' ||
              validation.reason === 'missing_flexible_30th');
          const needsFallbackDecision =
            dateType === 'hebrew' &&
            requires30thFallbackDecision(monthId, dayValue) &&
            canResolveWithFallback;

          if (validation && !validation.isValid) {
            if (validation.reason !== 'missing_flexible_30th') {
              issues.push(
                isRtl
                  ? '\u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d0 \u05e7\u05d9\u05d9\u05dd \u05d1\u05e9\u05e0\u05ea \u05d4\u05de\u05e7\u05d5\u05e8'
                  : 'Date does not exist in source year',
              );
            }
          }

          return {
            displayIndex: rowIndex + 1,
            rowNumber: headerRowIndex + rowIndex + 2,
            title: titleValue,
            categoryLabel,
            notes: notesValue || notesDefault,
            dateType,
            sourceYearLabel:
              dateType === 'hebrew'
                ? sourceYearLabel
                : derivedSourceYearValue
                  ? formatHebrewYear(derivedSourceYearValue)
                  : '',
            sourceYearValue:
              dateType === 'hebrew' ? sourceYearValue : derivedSourceYearValue,
            monthLabel: dateType === 'hebrew' ? monthLabel : derivedMonthLabel,
            monthId: dateType === 'hebrew' ? monthId : derivedMonthId,
            dayLabel: dateType === 'hebrew' ? dayLabel : derivedDayLabel,
            dayValue: dateType === 'hebrew' ? dayValue : derivedDayValue,
            gregorianDateLabel: dateType === 'gregorian' ? gregorianDateValue ?? gregorianDateLabel : '',
            afterSunset: dateType === 'gregorian' ? sunsetMode.afterSunset : false,
            sunsetModeLabel: dateType === 'gregorian' ? sunsetMode.label : '',
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
            ? '\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05e9\u05d5\u05e8\u05d5\u05ea \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05d1\u05d2\u05d9\u05dc\u05d9\u05d5\u05df Events.'
            : 'No event rows were found in the Events sheet.',
        );
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setImportPreviewRows([]);
      setImportPreviewError(
        errorMessage || (isRtl ? '\u05e7\u05e8\u05d9\u05d0\u05ea \u05d4\u05e7\u05d5\u05d1\u05e5 \u05e0\u05db\u05e9\u05dc\u05d4.' : 'Failed to read workbook.'),
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
          ? '\u05d0\u05d9\u05df \u05e9\u05d5\u05e8\u05d5\u05ea \u05de\u05d5\u05db\u05e0\u05d5\u05ea \u05dc\u05d9\u05d9\u05d1\u05d5\u05d0.'
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
                importCategoryMap[row.categoryLabel] ??
                  importCategoryMap[row.categoryLabel.toLowerCase()] ??
                  'other',
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
        isRtl ? `\u05e0\u05d5\u05e6\u05e8\u05d5: ${createdCount}` : `Created: ${createdCount}`,
        isRtl ? `\u05d3\u05d5\u05dc\u05d2\u05d5: ${skippedCount}` : `Skipped: ${skippedCount}`,
      ];

      if (failedRows.length > 0) {
        summaryParts.push(
          isRtl
            ? `\u05e0\u05db\u05e9\u05dc\u05d5 \u05d1\u05e9\u05d5\u05e8\u05d5\u05ea: ${failedRows.join(', ')}`
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
          (isRtl ? '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d9\u05d9\u05d1\u05d5\u05d0: ' : 'Import error: ') + errorMessage,
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
