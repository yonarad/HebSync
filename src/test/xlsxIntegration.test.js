import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('SheetJS integration', () => {
  it('loads the maintained release and parses the published import template', async () => {
    const xlsx = await import('xlsx');
    const template = readFileSync(
      resolve('public/templates/hebsync-events-import-template.xlsx'),
    );

    const workbook = xlsx.read(template, {
      type: 'buffer',
      dense: true,
      sheetRows: 1008,
    });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(firstSheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    expect(xlsx.version).toBe('0.20.3');
    expect(workbook.SheetNames).toContain('Events');
    expect(rows[1]).toEqual(
      expect.arrayContaining(['\u05e9\u05dd \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2', '\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d4', '\u05de\u05d5\u05e4\u05e2\u05d9\u05dd']),
    );
  });
});
