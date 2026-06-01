import { describe, expect, it } from 'vitest';
import { formatMobileHebrewDayLabel } from '../components/calendarViewUtils';

describe('formatMobileHebrewDayLabel', () => {
  it('removes geresh and gershayim to save space in mobile month cells', () => {
    expect(formatMobileHebrewDayLabel('א׳')).toBe('א');
    expect(formatMobileHebrewDayLabel('י״א')).toBe('יא');
    expect(formatMobileHebrewDayLabel('ט"ו')).toBe('טו');
    expect(formatMobileHebrewDayLabel('כ"ט')).toBe('כט');
  });
});
