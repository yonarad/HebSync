import { formatHebrewYear, requires30thFallbackDecision } from './hebcal';
import type { SpecialDateMetadataInput } from '../types/appTypes';

const ORIGINAL_YEAR_PREFIX = '\u05e9\u05e0\u05ea \u05de\u05e7\u05d5\u05e8: ';
const CREATED_BY_LABEL = '\u05e0\u05d5\u05e6\u05e8 \u05e2"\u05d9 "\u05e2\u05d1\u05e8\u05d9 \u05dc\u05d9\u05d5\u05de\u05df - HebSync"';
const SPECIAL_DATE_PREFIX = '\u05ea\u05d0\u05e8\u05d9\u05da \u05de\u05d9\u05d5\u05d7\u05d3: \u05dc\u05f3 \u05d1';

const SPECIAL_DATE_MONTH_LABELS: Record<string, string> = {
  Cheshvan: '\u05d7\u05e9\u05d5\u05d5\u05df',
  Kislev: '\u05db\u05e1\u05dc\u05d5',
  'Adar I': '\u05d0\u05d3\u05e8 \u05d0\u05f3',
};

const SPECIAL_DATE_FALLBACK_LABELS: Record<string, string> = {
  '29th': '\u05d1\u05e9\u05e0\u05d9\u05dd \u05e9\u05d1\u05d4\u05df \u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d0 \u05e7\u05d9\u05d9\u05dd, \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2 \u05de\u05d5\u05e7\u05d3\u05dd \u05dc\u05db\u05f4\u05d8 \u05d1\u05d0\u05d5\u05ea\u05d5 \u05d7\u05d5\u05d3\u05e9.',
  '1st': '\u05d1\u05e9\u05e0\u05d9\u05dd \u05e9\u05d1\u05d4\u05df \u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d0 \u05e7\u05d9\u05d9\u05dd, \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2 \u05e0\u05d3\u05d7\u05d4 \u05dc\u05d0\u05f3 \u05d1\u05d7\u05d5\u05d3\u05e9 \u05d4\u05d1\u05d0.',
  skip: '\u05d1\u05e9\u05e0\u05d9\u05dd \u05e9\u05d1\u05d4\u05df \u05d4\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d0 \u05e7\u05d9\u05d9\u05dd, \u05d0\u05d5\u05ea\u05d4 \u05e9\u05e0\u05d4 \u05de\u05d3\u05d5\u05dc\u05d2\u05ea \u05d5\u05dc\u05d0 \u05e0\u05d5\u05e6\u05e8 \u05de\u05d5\u05e4\u05e2.',
};

export function buildOriginalYearMetadata(originalHebrewYear: string | number): string {
  const originalYearNumber = Number(originalHebrewYear);
  return Number.isFinite(originalYearNumber)
    ? `${ORIGINAL_YEAR_PREFIX}${formatHebrewYear(originalYearNumber)} - ${originalHebrewYear}`
    : `${ORIGINAL_YEAR_PREFIX}${originalHebrewYear}`;
}

export function getCreatedByMetadataLabel(): string {
  return CREATED_BY_LABEL;
}

export function buildSpecialDateMetadata(
  specialDate?: SpecialDateMetadataInput | null,
): string {
  if (!specialDate) return '';

  const { monthName, day, fallback } = specialDate;
  if (!requires30thFallbackDecision(monthName, day)) {
    return '';
  }

  const monthLabel = SPECIAL_DATE_MONTH_LABELS[monthName] || monthName;
  const fallbackLabel = fallback ? SPECIAL_DATE_FALLBACK_LABELS[fallback] : '';

  if (!fallbackLabel) {
    return `${SPECIAL_DATE_PREFIX}${monthLabel}.`;
  }

  return `${SPECIAL_DATE_PREFIX}${monthLabel}\n${fallbackLabel}`;
}

export function chunkRdates(rdates: string[]): string[] {
  const chunkSize = 80;
  const recurrenceLines: string[] = [];

  for (let i = 0; i < rdates.length; i += chunkSize) {
    const chunk = rdates.slice(i, i + chunkSize);
    const cleanChunk = chunk.map((rdate) => rdate.replace('VALUE=DATE:', ''));
    recurrenceLines.push(`RDATE;VALUE=DATE:${cleanChunk.join(',')}`);
  }

  return recurrenceLines;
}
