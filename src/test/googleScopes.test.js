import { describe, expect, it } from 'vitest';
import { getScopesForMode } from '../../api/_lib/google.js';

describe('Google scope configuration', () => {
  it('keeps all-events mode limited to event editing plus app-owned calendar creation', () => {
    const scopes = getScopesForMode('all_events');

    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events');
    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.app.created');
    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
    expect(scopes).not.toContain('https://www.googleapis.com/auth/calendar');
  });
});
