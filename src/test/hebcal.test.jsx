import { describe, it, expect } from 'vitest';
import { gematriya, gregorianToHebrew, getDaysInHebrewMonth } from '../utils/hebcal';
import { HDate } from '@hebcal/core';

describe('Hebcal Utils', () => {
  it('should convert numbers to Gematriya correctly', () => {
    expect(gematriya(1)).toBe('א׳');
    expect(gematriya(15)).toBe('ט״ו');
    expect(gematriya(18)).toBe('י״ח');
    expect(gematriya(30)).toBe('ל׳');
  });

  it('should convert Gregorian to Hebrew correctly', () => {
    const gDate = new Date(2024, 4, 15); // May 15, 2024
    const hDate = gregorianToHebrew(gDate, false);
    expect(hDate.getDate()).toBe(7);
    expect(hDate.getMonthName()).toBe('Iyyar');
    expect(hDate.getFullYear()).toBe(5784);
  });

  it('should get correct days in Hebrew month', () => {
    expect(getDaysInHebrewMonth(5784, 'Nisan')).toBe(30);
    expect(getDaysInHebrewMonth(5784, 'Iyyar')).toBe(29);
  });
});
