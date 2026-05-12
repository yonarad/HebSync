import { describe, expect, it } from 'vitest';
import { HDate } from '@hebcal/core';
import { getHebrewMonthGregorianRange } from '../utils/calendarView';

describe('getHebrewMonthGregorianRange', () => {
  it('uses an exclusive end that includes the final day of the Hebrew month', () => {
    const viewHDate = new HDate(1, 'Adar I', 5784);
    const range = getHebrewMonthGregorianRange(viewHDate);
    const expectedStart = new HDate(1, 'Adar I', 5784).greg();
    const lastDay = HDate.daysInMonth(HDate.monthFromName('Adar I'), 5784);
    const expectedExclusiveEnd = new HDate(lastDay, 'Adar I', 5784).greg();
    expectedExclusiveEnd.setDate(expectedExclusiveEnd.getDate() + 1);

    expect(new Date(range.timeMin).getTime()).toBe(expectedStart.getTime());
    expect(new Date(range.timeMax).getTime()).toBe(expectedExclusiveEnd.getTime());
  });
});
