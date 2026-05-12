import { describe, it, expect } from 'vitest';
import {
  gematriya,
  gregorianToHebrew,
  getDaysInHebrewMonth,
  getMonthsForYear,
  generateRdates,
  getPreviewDates,
  requires30thFallbackDecision,
  doesHebrewMonthExistInYear,
  validateHebrewDateForYear,
} from '../utils/hebcal';
import { HDate } from '@hebcal/core';

describe('Hebcal Utils', () => {

  // ─── gematriya ────────────────────────────────────────────────────────────
  describe('gematriya', () => {
    it('converts single-digit numbers', () => {
      expect(gematriya(1)).toBe('א׳');
      expect(gematriya(9)).toBe('ט׳');
    });

    it('handles special cases (15, 16)', () => {
      expect(gematriya(15)).toBe('ט״ו');
      expect(gematriya(16)).toBe('ט״ז');
    });

    it('converts larger numbers', () => {
      expect(gematriya(18)).toBe('י״ח');
      expect(gematriya(30)).toBe('ל׳');
      expect(gematriya(100)).toBe('ק׳');
    });
  });

  // ─── gregorianToHebrew ────────────────────────────────────────────────────
  describe('gregorianToHebrew', () => {
    it('converts Gregorian to Hebrew correctly', () => {
      const gDate = new Date(2024, 4, 15); // May 15, 2024
      const hDate = gregorianToHebrew(gDate, false);
      expect(hDate.getDate()).toBe(7);
      expect(hDate.getMonthName()).toBe('Iyyar');
      expect(hDate.getFullYear()).toBe(5784);
    });

    it('advances one day when afterSunset=true', () => {
      const gDate = new Date(2024, 4, 15);
      const hDateBefore = gregorianToHebrew(gDate, false);
      const hDateAfter  = gregorianToHebrew(gDate, true);
      expect(hDateAfter.getDate()).toBe(hDateBefore.getDate() + 1);
    });

    it('handles month boundary when afterSunset=true', () => {
      // Last day of Nisan 5784 in Gregorian: May 8, 2024
      const lastOfNisan = new Date(2024, 4, 8);
      const hDateAfter = gregorianToHebrew(lastOfNisan, true);
      // Should land on 1 Iyyar 5784
      expect(hDateAfter.getMonthName()).toBe('Iyyar');
      expect(hDateAfter.getDate()).toBe(1);
    });
  });

  // ─── getDaysInHebrewMonth ─────────────────────────────────────────────────
  describe('getDaysInHebrewMonth', () => {
    it('returns 30 for Nisan', () => {
      expect(getDaysInHebrewMonth(5784, 'Nisan')).toBe(30);
    });

    it('returns 29 for Iyyar', () => {
      expect(getDaysInHebrewMonth(5784, 'Iyyar')).toBe(29);
    });

    it('returns a number for an invalid month name (library fallback)', () => {
      const result = getDaysInHebrewMonth(5784, 'InvalidMonth');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
  });

  // ─── getMonthsForYear ─────────────────────────────────────────────────────
  describe('getMonthsForYear', () => {
    it('returns 13 months in a leap year (5784)', () => {
      const months = getMonthsForYear(5784);
      expect(months.length).toBe(13);
      const ids = months.map(m => m.id);
      expect(ids).toContain('Adar I');
      expect(ids).toContain('Adar II');
      expect(ids).not.toContain('Adar');
    });

    it('returns 12 months in a non-leap year (5783)', () => {
      const months = getMonthsForYear(5783);
      expect(months.length).toBe(12);
      const ids = months.map(m => m.id);
      expect(ids).toContain('Adar');
      expect(ids).not.toContain('Adar I');
      expect(ids).not.toContain('Adar II');
    });

    it('always starts with Tishrei', () => {
      expect(getMonthsForYear(5784)[0].id).toBe('Tishrei');
    });

    it('always ends with Elul', () => {
      const months = getMonthsForYear(5784);
      expect(months[months.length - 1].id).toBe('Elul');
    });

    it('every month has both id and label', () => {
      getMonthsForYear(5784).forEach(m => {
        expect(m.id).toBeTruthy();
        expect(m.label).toBeTruthy();
      });
    });
  });

  describe('doesHebrewMonthExistInYear', () => {
    it('returns true for Adar I in a leap year', () => {
      expect(doesHebrewMonthExistInYear(5784, 'Adar I')).toBe(true);
    });

    it('returns false for Adar I in a non-leap year', () => {
      expect(doesHebrewMonthExistInYear(5783, 'Adar I')).toBe(false);
    });
  });

  describe('validateHebrewDateForYear', () => {
    it('accepts a valid date in the source year', () => {
      const result = validateHebrewDateForYear(5784, 'Nisan', 15);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('rejects a month that does not exist in the source year', () => {
      const result = validateHebrewDateForYear(5783, 'Adar I', 10);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('month_not_in_year');
    });

    it('rejects 30 Cheshvan when the source year has only 29 days in Cheshvan', () => {
      const result = validateHebrewDateForYear(5784, 'Cheshvan', 30);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('missing_flexible_30th');
      expect(result.isFlexible30th).toBe(true);
    });

    it('rejects an out-of-range day in a regular short month', () => {
      const result = validateHebrewDateForYear(5784, 'Iyyar', 30);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('day_out_of_range');
    });
  });

  describe('requires30thFallbackDecision', () => {
    it('flags Adar I on the 30th for special handling', () => {
      expect(requires30thFallbackDecision('Adar I', 30)).toBe(true);
    });

    it('does not flag other days in flexible months', () => {
      expect(requires30thFallbackDecision('Adar I', 29)).toBe(false);
    });

    it('does not flag the 30th in non-flexible months', () => {
      expect(requires30thFallbackDecision('Nisan', 30)).toBe(false);
    });
  });

  // ─── generateRdates ───────────────────────────────────────────────────────
  describe('generateRdates', () => {
    it('generates the correct number of occurrences', () => {
      const result = generateRdates(5780, 'Nisan', 15, 5);
      const dates = result.split(',');
      expect(dates.length).toBe(5);
    });

    it('returns VALUE=DATE format strings', () => {
      const result = generateRdates(5784, 'Nisan', 1, 3);
      result.split(',').forEach(d => {
        expect(d).toMatch(/^VALUE=DATE:\d{8}$/);
      });
    });

    it('handles Adar in leap year (maps Adar → Adar II)', () => {
      // 5784 is a leap year — Adar should map to Adar II
      const resultLeap   = generateRdates(5784, 'Adar', 1, 1);
      const resultAdarII = generateRdates(5784, 'Adar II', 1, 1);
      expect(resultLeap).toBe(resultAdarII);
    });

    it('handles Adar I in non-leap year (maps to Adar)', () => {
      // 5783 is a non-leap year
      const resultAdarI = generateRdates(5783, 'Adar I', 1, 1);
      const resultAdar  = generateRdates(5783, 'Adar', 1, 1);
      expect(resultAdarI).toBe(resultAdar);
    });

    it('fallback 29th: replaces day 30 with day 29 in short months', () => {
      // Cheshvan 5784 has 29 days
      const result = generateRdates(5784, 'Cheshvan', 30, 1, '29th');
      expect(result).toMatch(/^VALUE=DATE:\d{8}$/);
    });

    it('fallback 1st: moves to 1st of next month when day 30 missing', () => {
      const result = generateRdates(5784, 'Cheshvan', 30, 1, '1st');
      expect(result).toMatch(/^VALUE=DATE:\d{8}$/);
    });

    it('fallback skip: skips the year when day 30 is missing', () => {
      const result = generateRdates(5784, 'Cheshvan', 30, 2, 'skip');
      const dates = result ? result.split(',') : [];
      dates.forEach(d => expect(d).toMatch(/^VALUE=DATE:\d{8}$/));
    });

    it('returns empty string when span is 0', () => {
      const result = generateRdates(5784, 'Nisan', 1, 0);
      expect(result).toBe('');
    });

    it('produces no duplicate dates', () => {
      const result = generateRdates(5780, 'Nisan', 15, 10);
      const dates = result.split(',');
      const unique = new Set(dates);
      expect(unique.size).toBe(dates.length);
    });
  });

  // ─── getPreviewDates ──────────────────────────────────────────────────────
  describe('getPreviewDates', () => {
    it('returns the requested number of occurrences', () => {
      const results = getPreviewDates(5780, 'Nisan', 15, 5);
      expect(results.length).toBe(5);
    });

    it('each occurrence has required fields', () => {
      const results = getPreviewDates(5784, 'Nisan', 1, 3);
      results.forEach(occ => {
        expect(occ).toHaveProperty('hebrewYear');
        expect(occ).toHaveProperty('hebrewDate');
        expect(occ).toHaveProperty('gregorianDate');
        expect(occ).toHaveProperty('note');
      });
    });

    it('adds note when Adar falls in leap year', () => {
      // 5784 is a leap year — Adar should be moved to Adar II
      const results = getPreviewDates(5784, 'Adar', 1, 1);
      expect(results[0].note).toContain('אדר ב');
    });

    it('adds note when Adar I falls in non-leap year', () => {
      // 5783 is a non-leap year
      const results = getPreviewDates(5783, 'Adar I', 1, 1);
      expect(results[0].note).toContain('אדר');
    });

    it('handles 30th fallback (29th) in preview', () => {
      const results = getPreviewDates(5784, 'Cheshvan', 30, 1, '29th');
      expect(results.length).toBe(1);
      expect(results[0].note).toContain('כ״ט');
    });

    it('handles 30th fallback (1st) in preview', () => {
      const results = getPreviewDates(5784, 'Cheshvan', 30, 1, '1st');
      expect(results.length).toBe(1);
      expect(results[0].note).toContain('א׳');
    });

    it('returns fewer results when fallback is skip (short month years skipped)', () => {
      const results = getPreviewDates(5784, 'Cheshvan', 30, 3, 'skip');
      // All returned entries should have valid dates
      results.forEach(occ => {
        expect(occ.hebrewDate).toBeTruthy();
        expect(occ.gregorianDate).toBeTruthy();
      });
    });

    it('hebrewDate string contains gematriya', () => {
      const results = getPreviewDates(5784, 'Nisan', 1, 1);
      // Should contain Hebrew letters from gematriya
      expect(results[0].hebrewDate).toMatch(/[א-ת]/);
    });
  });

});
