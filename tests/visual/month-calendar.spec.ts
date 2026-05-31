import { expect, test } from '@playwright/test';
import { openCalendar } from './calendarVisualFixtures';

test.describe('month calendar visual regression', () => {
  test('desktop month view keeps overflow button aligned inside the grid', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await expect(page.getByTestId('month-calendar-view')).toBeVisible();
    await expect(page.getByTestId('calendar-surface')).toHaveScreenshot('month-calendar-desktop.png');
  });

  test('desktop popover stays anchored for bottom-row overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByRole('button', { name: /עוד \d+ אירועים/ }).last().click();
    await expect(page.getByTestId('day-events-popover')).toBeVisible();
    await expect(page.getByTestId('calendar-main')).toHaveScreenshot('month-calendar-bottom-popover.png');
  });

  test('mobile popover stays connected to the tapped day', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCalendar(page);

    await page.getByRole('button', { name: 'חודש', exact: true }).click();
    await page.getByRole('button', { name: /עוד \d+ אירועים/ }).last().click();

    await expect(page.getByTestId('day-events-popover')).toBeVisible();
    await expect(page).toHaveScreenshot('month-calendar-mobile-popover.png');
  });

  test('schedule view stays visually stable after the component split', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByRole('button', { name: 'לוח זמנים', exact: true }).click();
    await expect(page.getByTestId('schedule-calendar-view')).toBeVisible();
    await expect(page.getByTestId('calendar-surface')).toHaveScreenshot('schedule-view-desktop.png');
  });

  test('search results stay visually stable after the component split', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('desktop-search-toggle').click();
    await page.getByTestId('desktop-search-input').fill('שחרית');
    await page.getByTestId('desktop-search-submit').click();

    await expect(page.getByTestId('search-results-view')).toBeVisible();
    await expect(page.getByTestId('calendar-surface')).toHaveScreenshot('search-results-desktop.png');
  });
});
