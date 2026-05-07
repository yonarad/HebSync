import { describe, expect, it } from 'vitest';
import { getScopesForMode } from '../../api/_lib/google.js';

describe('Google scope configuration', () => {
  it('uses only openid and email for identity scopes', () => {
    const appCreatedScopes = getScopesForMode('app_created');
    const readOnlyScopes = getScopesForMode('read_only');
    const allEventsScopes = getScopesForMode('all_events');

    expect(appCreatedScopes).toContain('openid');
    expect(appCreatedScopes).toContain('email');
    expect(appCreatedScopes).not.toContain('profile');
    expect(readOnlyScopes).not.toContain('profile');
    expect(allEventsScopes).not.toContain('profile');
  });

  it('keeps read-only mode cumulative with the app-created baseline', () => {
    const scopes = getScopesForMode('read_only');

    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.app.created');
    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.readonly');
    expect(scopes).not.toContain('https://www.googleapis.com/auth/calendar');
    expect(scopes).not.toContain('https://www.googleapis.com/auth/calendar.events');
  });

  it('keeps all-events mode cumulative and excludes the broad calendar scope', () => {
    const scopes = getScopesForMode('all_events');

    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.readonly');
    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events');
    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.app.created');
    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
    expect(scopes).not.toContain('https://www.googleapis.com/auth/calendar');
  });
});
