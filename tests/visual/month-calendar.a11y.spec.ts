import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openCalendar } from './calendarVisualFixtures';

async function expectNoA11yViolations(page: Parameters<typeof AxeBuilder>[0]['page'], includeSelector: string) {
  const results = await new AxeBuilder({ page })
    .include(includeSelector)
    .analyze();

  expect(results.violations).toEqual([]);
}

test.describe('month calendar accessibility', () => {
  test('month calendar main surface has no critical accessibility violations', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await expect(page.getByTestId('calendar-main')).toBeVisible();
    await expectNoA11yViolations(page, '[data-testid="calendar-main"]');
  });

  test('overflow popover has no accessibility violations when open', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('month-overflow-button').last().click();
    await expect(page.getByTestId('day-events-popover')).toBeVisible();
    await expectNoA11yViolations(page, '[data-testid="day-events-popover"]');
  });

  test('mobile search dialog has no accessibility violations when open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCalendar(page);

    await page.getByTestId('mobile-search-toggle').click();
    await expect(page.getByTestId('mobile-search-dialog')).toBeVisible();
    await expectNoA11yViolations(page, '[data-testid="mobile-search-dialog"]');
  });

  test('event details dialog has no accessibility violations when open', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('calendar-view-schedule-toggle').click();
    await page.getByTestId('schedule-recurring-event-chip').first().click();
    await expect(page.getByTestId('event-details-dialog')).toBeVisible();
    await expectNoA11yViolations(page, '[data-testid="event-details-dialog"]');
  });

  test('recurring action dialog has no accessibility violations when open', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('calendar-view-schedule-toggle').click();
    await page.getByTestId('schedule-recurring-event-chip').first().click();
    await expect(page.getByTestId('event-details-dialog')).toBeVisible();

    await page.getByTestId('event-details-delete-button').click();
    await expect(page.getByTestId('recurring-action-dialog')).toBeVisible();
    await expectNoA11yViolations(page, '[data-testid="recurring-action-dialog"]');
  });
});
