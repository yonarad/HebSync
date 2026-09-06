import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const APP_SIGNATURE = 'ID:hebcal-sync-app';
const WRITE_ACKNOWLEDGEMENT = 'temporary-event';

interface SessionBody {
  authenticated?: boolean;
  user?: {
    csrfToken?: string;
    scopeMode?: string | null;
  };
}

interface CalendarItem {
  accessRole?: string;
  description?: string;
  id?: string;
}

interface CalendarListBody {
  items?: CalendarItem[];
  scopeMode?: string | null;
}

interface EventBody {
  id?: string;
  summary?: string;
}

function monitorProductionErrors(page: Page): string[] {
  const errors: string[] = [];
  const productionOrigin = new URL(process.env.SMOKE_BASE_URL as string).origin;

  page.on('pageerror', (error) => errors.push(`Page error: ${error.message}`));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === productionOrigin && response.status() >= 500) {
      errors.push(`${response.status()} ${response.request().method()} ${url.pathname}`);
    }
  });

  return errors;
}

async function getSession(request: APIRequestContext): Promise<SessionBody> {
  const response = await request.get('/api/auth/session');
  expect(response.status(), 'The captured HebSync session is no longer authenticated.').toBe(200);
  const body = (await response.json()) as SessionBody;
  expect(body.authenticated).toBe(true);
  expect(body.user?.csrfToken, 'The authenticated session did not provide a CSRF token.').toBeTruthy();
  return body;
}

async function findWritableHebSyncCalendar(
  request: APIRequestContext,
): Promise<{ calendarId: string; scopeMode: string | null }> {
  const response = await request.get('/api/google/calendars');
  expect(response.status(), 'Google Calendar listing failed.').toBe(200);
  const body = (await response.json()) as CalendarListBody;
  const calendar = (body.items || []).find(
    (item) =>
      Boolean(item.id) &&
      ['owner', 'writer'].includes(item.accessRole || '') &&
      item.description?.includes(APP_SIGNATURE),
  );

  expect(
    calendar?.id,
    'No writable HebSync-created calendar was found. Create one in HebSync before running the write smoke test.',
  ).toBeTruthy();

  return { calendarId: calendar?.id as string, scopeMode: body.scopeMode || null };
}

function dateOnly(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

test.describe('authenticated production smoke', () => {
  test('restores the session and loads calendars in the production UI', async ({ page, request }) => {
    const errors = monitorProductionErrors(page);
    await getSession(request);

    await page.goto('/calendar', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('login-modal-panel')).toBeHidden();
    await expect(page.getByTestId('calendar-main')).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('button', { name: /^(Refresh calendars|רענן יומנים)$/ }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('creates, finds, updates, and removes one isolated Google Calendar event', async ({
    request,
  }) => {
    test.skip(
      process.env.AUTHENTICATED_SMOKE_MUTATION_ACK !== WRITE_ACKNOWLEDGEMENT,
      `Set AUTHENTICATED_SMOKE_MUTATION_ACK=${WRITE_ACKNOWLEDGEMENT} only after approving a temporary Google Calendar event mutation.`,
    );

    const session = await getSession(request);
    expect(
      ['app_created', 'all_events'],
      'The connected Google account does not grant event editing.',
    ).toContain(session.user?.scopeMode);

    const { calendarId } = await findWritableHebSyncCalendar(request);
    const csrfHeaders = { 'x-csrf-token': session.user?.csrfToken as string };
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const originalTitle = `[HebSync smoke] ${runId}`;
    const updatedTitle = `${originalTitle} updated`;
    let eventId;
    let cleanupError;

    try {
      const createResponse = await request.post('/api/google/events', {
        headers: csrfHeaders,
        data: {
          calendarId,
          eventPayload: {
            summary: originalTitle,
            description: 'Temporary HebSync authenticated production smoke event.',
            start: { date: dateOnly(1) },
            end: { date: dateOnly(2) },
            reminders: { useDefault: false },
            extendedProperties: {
              private: {
                appIdentifier: 'HebSyncSmokeTest',
                smokeRunId: runId,
              },
            },
          },
        },
      });
      expect(createResponse.status(), 'Temporary event creation failed.').toBe(201);
      const created = (await createResponse.json()) as EventBody;
      eventId = created.id;
      expect(eventId).toBeTruthy();
      expect(created.summary).toBe(originalTitle);

      const searchResponse = await request.post('/api/google/events/search', {
        headers: csrfHeaders,
        data: {
          calendarIds: [calendarId],
          query: originalTitle,
          timeMin: `${dateOnly(0)}T00:00:00.000Z`,
          timeMax: `${dateOnly(3)}T00:00:00.000Z`,
        },
      });
      expect(searchResponse.status(), 'Temporary event search failed.').toBe(200);
      const searchBody = (await searchResponse.json()) as { items?: EventBody[] };
      expect(searchBody.items?.some((item) => item.id === eventId)).toBe(true);

      const eventUrl = `/api/google/event?calendarId=${encodeURIComponent(calendarId)}&eventId=${encodeURIComponent(eventId as string)}`;
      const updateResponse = await request.patch(eventUrl, {
        headers: csrfHeaders,
        data: { summary: updatedTitle },
      });
      expect(updateResponse.status(), 'Temporary event update failed.').toBe(200);
      const updated = (await updateResponse.json()) as EventBody;
      expect(updated.summary).toBe(updatedTitle);

      const fetchResponse = await request.get(eventUrl);
      expect(fetchResponse.status(), 'Updated temporary event could not be fetched.').toBe(200);
      const fetched = (await fetchResponse.json()) as EventBody;
      expect(fetched.id).toBe(eventId);
      expect(fetched.summary).toBe(updatedTitle);
    } finally {
      if (eventId) {
        const eventUrl = `/api/google/event?calendarId=${encodeURIComponent(calendarId)}&eventId=${encodeURIComponent(eventId)}`;
        const deleteResponse = await request.delete(eventUrl, { headers: csrfHeaders });
        if (deleteResponse.status() !== 200) {
          cleanupError = new Error(
            'CRITICAL: the temporary smoke event could not be removed from Google Calendar.',
          );
        }
      }
    }

    if (cleanupError) throw cleanupError;
  });
});
