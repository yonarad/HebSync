import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openCalendar } from './calendarVisualFixtures';

async function expectNoA11yViolations(
  page: Parameters<typeof AxeBuilder>[0]['page'],
  includeSelector: string,
) {
  const results = await new AxeBuilder({ page })
    .include(includeSelector)
    .analyze();

  expect(results.violations).toEqual([]);
}

test.describe('shell accessibility', () => {
  test('mobile sidebar has no accessibility violations when open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCalendar(page);

    await page.getByTestId('sidebar-menu-button').click();
    await expect(page.getByTestId('calendar-sidebar')).toBeVisible();
    await expectNoA11yViolations(page, '[data-testid="calendar-sidebar"]');
  });

  test('login modal has no accessibility violations when opened from logged-out state', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page, { authenticated: false });

    await expect(page.getByTestId('login-modal-panel')).toBeVisible();
    await expectNoA11yViolations(page, '[data-testid="login-modal-panel"]');
  });
});
