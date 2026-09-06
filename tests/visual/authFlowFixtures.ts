import type { Page, Request } from '@playwright/test';

const AUTH_STATE_STORAGE_KEY = 'gcal_auth_state';
const TEST_CSRF_TOKEN = 'auth-e2e-csrf';

type ScopeMode = 'app_created' | 'read_only' | 'all_events';

interface AuthFlowState {
  authenticated: boolean;
  scopeMode: ScopeMode;
  expireCalendarRequest: boolean;
}

export interface AuthFlowApi {
  oauthStartRequests: Request[];
  logoutRequests: Request[];
  accountDeleteRequests: Request[];
  expireNextCalendarRequest: () => void;
}

const calendars = [
  {
    id: 'auth-test-calendar',
    summary: 'HebSync Auth Test',
    accessRole: 'owner',
    backgroundColor: '#1a73e8',
    foregroundColor: '#ffffff',
    colorId: '1',
    description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
  },
];

function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export async function mockAuthFlow(
  page: Page,
  initialState: { authenticated: boolean; scopeMode?: ScopeMode },
): Promise<AuthFlowApi> {
  const state: AuthFlowState = {
    authenticated: initialState.authenticated,
    scopeMode: initialState.scopeMode || 'all_events',
    expireCalendarRequest: false,
  };
  const oauthStartRequests: Request[] = [];
  const logoutRequests: Request[] = [];
  const accountDeleteRequests: Request[] = [];

  await page.addInitScript(
    ({ authenticated, scopeMode, storageKey }) => {
      window.localStorage.setItem('i18nextLng', 'en');

      if (window.sessionStorage.getItem('hebsync.authE2e.initialized')) return;

      window.sessionStorage.setItem('hebsync.authE2e.initialized', 'true');
      if (authenticated) {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ authenticated: true, scopeMode }),
        );
      } else {
        window.localStorage.removeItem(storageKey);
      }
    },
    {
      authenticated: state.authenticated,
      scopeMode: state.scopeMode,
      storageKey: AUTH_STATE_STORAGE_KEY,
    },
  );

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/auth/google/start') {
      oauthStartRequests.push(request);
      state.authenticated = true;
      state.scopeMode = (url.searchParams.get('scopeMode') as ScopeMode) || 'app_created';
      await route.fulfill({
        status: 302,
        headers: { location: url.searchParams.get('returnTo') || '/calendar' },
      });
      return;
    }

    if (url.pathname === '/api/auth/session') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: jsonBody(
          state.authenticated
            ? {
                authenticated: true,
                user: {
                  scopeMode: state.scopeMode,
                  csrfToken: TEST_CSRF_TOKEN,
                  user: {
                    email: 'auth-e2e@example.com',
                    name: 'Auth E2E',
                    csrfToken: TEST_CSRF_TOKEN,
                  },
                },
              }
            : { authenticated: false },
        ),
      });
      return;
    }

    if (url.pathname === '/api/auth/logout') {
      logoutRequests.push(request);
      state.authenticated = false;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }

    if (url.pathname === '/api/auth/account') {
      accountDeleteRequests.push(request);
      state.authenticated = false;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }

    if (url.pathname === '/api/google/calendars') {
      if (state.expireCalendarRequest) {
        state.expireCalendarRequest = false;
        state.authenticated = false;
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: jsonBody({ code: 'AUTH_EXPIRED', message: 'Session expired' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: jsonBody({ items: calendars, scopeMode: state.scopeMode }),
      });
      return;
    }

    if (url.pathname === '/api/google/colors') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: jsonBody({ calendar: {}, event: {} }),
      });
      return;
    }

    if (
      url.pathname === '/api/google/events/app' ||
      url.pathname === '/api/google/events/in-range' ||
      url.pathname === '/api/google/events/search'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: jsonBody({ items: [] }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  return {
    oauthStartRequests,
    logoutRequests,
    accountDeleteRequests,
    expireNextCalendarRequest: () => {
      state.expireCalendarRequest = true;
    },
  };
}
