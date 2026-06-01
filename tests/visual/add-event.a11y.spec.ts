import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openCalendar } from './calendarVisualFixtures';

async function expectNoA11yViolations(page: Parameters<typeof AxeBuilder>[0]['page'], includeSelector: string) {
  const results = await new AxeBuilder({ page })
    .include(includeSelector)
    .analyze();

  expect(results.violations).toEqual([]);
}

test.describe('add event accessibility', () => {
  test('add event dialog has no accessibility violations in manual mode', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('open-add-event-button').click();
    await expect(page.getByTestId('add-event-dialog')).toBeVisible();
    await expectNoA11yViolations(page, '[data-testid="add-event-dialog"]');
  });

  test('add event dialog has no accessibility violations in import mode', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('open-add-event-button').click();
    await expect(page.getByTestId('add-event-dialog')).toBeVisible();

    await page.getByTestId('add-event-import-tab').click();
    await expect(page.getByTestId('import-workbook-input')).toBeAttached();
    await expectNoA11yViolations(page, '[data-testid="add-event-dialog"]');
  });
});
