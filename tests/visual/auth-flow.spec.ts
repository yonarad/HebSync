import { expect, test } from '@playwright/test';
import { mockAuthFlow } from './authFlowFixtures';

const AUTH_STATE_STORAGE_KEY = 'gcal_auth_state';
const TEST_CSRF_TOKEN = 'auth-e2e-csrf';

test.describe('mocked authentication lifecycle', () => {
  test('connects through the OAuth redirect and restores the session after reload', async ({ page }) => {
    const api = await mockAuthFlow(page, { authenticated: false });

    await page.goto('/calendar');
    const loginModal = page.getByTestId('login-modal-panel');
    await expect(loginModal).toBeVisible({ timeout: 15_000 });

    await loginModal.getByRole('button', { name: /^(Continue|המשך)$/ }).click();

    await expect(loginModal).toBeHidden();
    await expect(page.getByRole('button', { name: /^(Refresh calendars|רענן יומנים)$/ })).toBeVisible();
    await expect.poll(() => api.oauthStartRequests.length).toBe(1);

    const oauthUrl = new URL(api.oauthStartRequests[0].url());
    expect(oauthUrl.searchParams.get('scopeMode')).toBe('app_created');
    expect(oauthUrl.searchParams.get('returnTo')).toBe('/calendar');
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), AUTH_STATE_STORAGE_KEY))
      .toContain('app_created');

    await page.reload();

    await expect(page.getByRole('button', { name: /^(Refresh calendars|רענן יומנים)$/ })).toBeVisible();
    await expect(loginModal).toBeHidden();
  });

  test('clears stale auth state and offers reauthorization after session expiry', async ({ page }) => {
    const api = await mockAuthFlow(page, { authenticated: true, scopeMode: 'all_events' });

    await page.goto('/calendar');
    const refreshButton = page.getByRole('button', { name: /^(Refresh calendars|רענן יומנים)$/ });
    await expect(refreshButton).toBeVisible({ timeout: 15_000 });

    api.expireNextCalendarRequest();
    await refreshButton.click();

    const loginModal = page.getByTestId('login-modal-panel');
    await expect(loginModal).toBeVisible();
    await expect(loginModal).toContainText(/Reconnect Google|חבר מחדש את היומן/);
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), AUTH_STATE_STORAGE_KEY))
      .toBeNull();

    await loginModal.getByRole('button', { name: /^(Continue|המשך)$/ }).click();

    await expect(loginModal).toBeHidden();
    await expect(refreshButton).toBeVisible();
    await expect.poll(() => api.oauthStartRequests.length).toBe(1);
  });

  test('disconnects with CSRF protection and returns to the logged-out home page', async ({ page }) => {
    const api = await mockAuthFlow(page, { authenticated: true, scopeMode: 'all_events' });
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/calendar');
    const disconnectButton = page.getByRole('button', { name: /^(Disconnect Account|ניתוק חשבון)$/ });
    await expect(disconnectButton).toBeVisible({ timeout: 15_000 });
    await disconnectButton.click();

    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => api.logoutRequests.length).toBe(1);
    expect(api.logoutRequests[0].method()).toBe('POST');
    expect(api.logoutRequests[0].headers()['x-csrf-token']).toBe(TEST_CSRF_TOKEN);
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), AUTH_STATE_STORAGE_KEY))
      .toBeNull();
  });

  test('deletes account data with CSRF protection and clears local auth state', async ({ page }) => {
    const api = await mockAuthFlow(page, { authenticated: true, scopeMode: 'all_events' });
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/privacy');
    const deleteButton = page.getByRole('button', { name: /^(Delete My Data|מחיקת נתוני HebSync)$/ });
    await expect(deleteButton).toBeVisible({ timeout: 15_000 });
    await deleteButton.click();

    await expect(page).toHaveURL(/\/\?about=1$/);
    await expect.poll(() => api.accountDeleteRequests.length).toBe(1);
    expect(api.accountDeleteRequests[0].method()).toBe('DELETE');
    expect(api.accountDeleteRequests[0].headers()['x-csrf-token']).toBe(TEST_CSRF_TOKEN);
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), AUTH_STATE_STORAGE_KEY))
      .toBeNull();
  });
});
