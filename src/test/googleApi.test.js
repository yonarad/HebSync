import { describe, expect, it } from 'vitest';
import { buildSpecialDateMetadata } from '../utils/googleApi';

describe('buildSpecialDateMetadata', () => {
  it('describes the fallback policy for 30 Cheshvan', () => {
    const result = buildSpecialDateMetadata({
      monthName: 'Cheshvan',
      day: 30,
      fallback: '29th',
    });

    expect(result).toContain('תאריך מיוחד: ל׳ בחשוון');
    expect(result).toContain('מוקדם לכ״ט באותו חודש');
  });

  it('describes the skip policy for 30 Adar I', () => {
    const result = buildSpecialDateMetadata({
      monthName: 'Adar I',
      day: 30,
      fallback: 'skip',
    });

    expect(result).toContain('תאריך מיוחד: ל׳ באדר א׳');
    expect(result).toContain('אותה שנה מדולגת');
  });

  it('returns empty text for non-special dates', () => {
    expect(buildSpecialDateMetadata({
      monthName: 'Nisan',
      day: 30,
      fallback: '29th',
    })).toBe('');
  });
});
