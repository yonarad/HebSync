import { describe, expect, it } from 'vitest';
import { buildSpecialDateMetadata } from '../utils/googleApi';

describe('buildSpecialDateMetadata', () => {
  it('describes the fallback policy for 30 Cheshvan', () => {
    const result = buildSpecialDateMetadata({
      monthName: 'Cheshvan',
      day: 30,
      fallback: '29th',
    });

    expect(result).toContain('\u05ea\u05d0\u05e8\u05d9\u05da \u05de\u05d9\u05d5\u05d7\u05d3: \u05dc\u05f3 \u05d1\u05d7\u05e9\u05d5\u05d5\u05df');
    expect(result).toContain('\u05de\u05d5\u05e7\u05d3\u05dd \u05dc\u05db\u05f4\u05d8 \u05d1\u05d0\u05d5\u05ea\u05d5 \u05d7\u05d5\u05d3\u05e9');
  });

  it('describes the skip policy for 30 Adar I', () => {
    const result = buildSpecialDateMetadata({
      monthName: 'Adar I',
      day: 30,
      fallback: 'skip',
    });

    expect(result).toContain('\u05ea\u05d0\u05e8\u05d9\u05da \u05de\u05d9\u05d5\u05d7\u05d3: \u05dc\u05f3 \u05d1\u05d0\u05d3\u05e8 \u05d0\u05f3');
    expect(result).toContain('\u05d0\u05d5\u05ea\u05d4 \u05e9\u05e0\u05d4 \u05de\u05d3\u05d5\u05dc\u05d2\u05ea');
  });

  it('returns empty text for non-special dates', () => {
    expect(buildSpecialDateMetadata({
      monthName: 'Nisan',
      day: 30,
      fallback: '29th',
    })).toBe('');
  });
});
