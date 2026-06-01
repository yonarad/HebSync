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

    await page.getByTestId('month-overflow-button').last().click();
    await expect(page.getByTestId('day-events-popover')).toBeVisible();
    await expect(page.getByTestId('calendar-main')).toHaveScreenshot('month-calendar-bottom-popover.png');
  });

  test('mobile popover stays connected to the tapped day', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCalendar(page);

    await page.getByTestId('calendar-view-month-toggle').click();
    await page.getByTestId('month-overflow-button').last().click();

    await expect(page.getByTestId('day-events-popover')).toBeVisible();
    await expect(page).toHaveScreenshot('month-calendar-mobile-popover.png');
  });

  test('schedule view stays visually stable after the component split', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('calendar-view-schedule-toggle').click();
    await expect(page.getByTestId('schedule-calendar-view')).toBeVisible();
    await expect(page.getByTestId('calendar-surface')).toHaveScreenshot('schedule-view-desktop.png');
  });

  test('search results stay visually stable after the component split', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('desktop-search-toggle').click();
    await page.getByTestId('desktop-search-input').fill('search');
    await page.getByTestId('desktop-search-submit').click();

    await expect(page.getByTestId('search-results-view')).toBeVisible();
    await expect(page.getByTestId('calendar-surface')).toHaveScreenshot('search-results-desktop.png');
  });

  test('display options menu stays visually stable when open', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('display-options-toggle').click();
    await expect(page.getByTestId('display-options-menu')).toBeVisible();
    await expect(page.getByTestId('calendar-main')).toHaveScreenshot('display-options-open-desktop.png');
  });

  test('advanced search panel stays visually stable when open', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    await page.getByTestId('desktop-search-toggle').click();
    await page.getByTestId('desktop-search-advanced-toggle').click();

    await expect(page.getByTestId('desktop-search-panel')).toBeVisible();
    await expect(page.getByTestId('calendar-main')).toHaveScreenshot('advanced-search-panel-open-desktop.png');
  });

  test('narrow desktop month view stays visually stable', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openCalendar(page);

    await expect(page.getByTestId('month-calendar-view')).toBeVisible();
    await expect(page.getByTestId('calendar-main')).toHaveScreenshot('month-calendar-narrow-desktop.png');
  });

  test('mobile search results stay visually stable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCalendar(page);

    await page.getByTestId('mobile-search-toggle').click();
    await expect(page.getByTestId('mobile-search-dialog')).toBeVisible();
    await page.getByTestId('mobile-search-input').fill('search');
    await page.getByTestId('mobile-search-submit').click();

    await expect(page.getByTestId('search-results-view')).toBeVisible();
    await expect(page).toHaveScreenshot('search-results-mobile.png');
  });

  test('narrow desktop schedule view stays visually stable', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openCalendar(page);

    await page.getByTestId('calendar-view-schedule-toggle').click();
    await expect(page.getByTestId('schedule-calendar-view')).toBeVisible();
    await expect(page.getByTestId('calendar-main')).toHaveScreenshot('schedule-view-narrow-desktop.png');
  });

  test('keyboard flow keeps focus anchored around the overflow popover', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    const moreButton = page.getByTestId('month-overflow-button').last();
    await moreButton.focus();
    await expect(moreButton).toBeFocused();

    await page.keyboard.press('Enter');

    const popover = page.getByTestId('day-events-popover');
    await expect(popover).toBeVisible();
    await expect(popover.locator('button').first()).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(popover).toHaveCount(0);
    await expect(moreButton).toBeFocused();
  });

  test('keyboard flow keeps display options tied to its toggle', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await openCalendar(page);

    const displayToggle = page.getByTestId('display-options-toggle');
    await displayToggle.focus();
    await expect(displayToggle).toBeFocused();

    await page.keyboard.press('Enter');

    const displayMenu = page.getByTestId('display-options-menu');
    await expect(displayMenu).toBeVisible();
    await expect(displayMenu.locator('input[type="checkbox"]').first()).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(displayMenu).toHaveCount(0);
    await expect(displayToggle).toBeFocused();
  });
});
