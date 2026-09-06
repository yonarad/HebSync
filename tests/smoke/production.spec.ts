import { expect, test, type Page } from '@playwright/test';

function monitorProductionErrors(page: Page): string[] {
  const errors: string[] = [];
  const productionOrigin = new URL(process.env.SMOKE_BASE_URL as string).origin;

  page.on('pageerror', (error) => errors.push(`Page error: ${error.message}`));
  page.on('response', (response) => {
    if (new URL(response.url()).origin === productionOrigin && response.status() >= 500) {
      errors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('gcal_auth_state');
  });
});

test('public application and legal pages load cleanly', async ({ page }) => {
  const errors = monitorProductionErrors(page);

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/HebSync/i);
  await expect(
    page.getByRole('heading', {
      name: /Hebrew dates that stay in sync with your calendar|תאריכים עבריים חוזרים ביומן גוגל/,
    }),
  ).toBeVisible();

  await page.goto('/privacy', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { name: /^(Privacy Policy|מדיניות פרטיות)$/ }),
  ).toBeVisible();

  await page.goto('/terms', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { name: /^(Terms of Service|תנאי שימוש)$/ }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test('unauthenticated API boundary and Google OAuth entry point are healthy', async ({
  page,
  request,
}) => {
  const sessionResponse = await request.get('/api/auth/session');
  expect(sessionResponse.status()).toBe(401);
  await expect(sessionResponse.json()).resolves.toEqual({ authenticated: false });

  const calendarsResponse = await request.get('/api/google/calendars');
  expect(calendarsResponse.status()).toBe(401);
  await expect(calendarsResponse.json()).resolves.toEqual({ error: 'Not authenticated' });

  const oauthResponse = await request.get(
    '/api/auth/google/start?scopeMode=app_created&returnTo=%2Fcalendar',
    { maxRedirects: 0 },
  );
  expect(oauthResponse.status()).toBeGreaterThanOrEqual(300);
  expect(oauthResponse.status()).toBeLessThan(400);

  const location = oauthResponse.headers().location;
  expect(location).toBeTruthy();
  const consentUrl = new URL(location as string);
  expect(consentUrl.hostname).toBe('accounts.google.com');
  expect(consentUrl.searchParams.get('client_id')).toBeTruthy();
  expect(consentUrl.searchParams.get('state')).toBeTruthy();

  const redirectUriValue = consentUrl.searchParams.get('redirect_uri');
  expect(redirectUriValue).toBeTruthy();
  const redirectUri = new URL(redirectUriValue as string);
  expect(redirectUri.origin).toBe(new URL(process.env.SMOKE_BASE_URL as string).origin);
  expect(redirectUri.pathname).toBe('/api/auth/google/callback');

  const errors = monitorProductionErrors(page);
  await page.goto('/calendar', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('login-modal-panel')).toBeVisible();
  await expect(
    page.getByText(/Connect your Google account to view calendars|כדי לראות יומנים/),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
