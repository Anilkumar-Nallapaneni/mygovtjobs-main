import { expect, test } from '@playwright/test';

test.describe('browse flows', () => {
  test('home loads jobs and category browser', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('.app-sector-browser')).toBeVisible();
    await expect(page.locator('.job-card').first()).toBeVisible({ timeout: 30_000 });
  });

  test('search filters job list', async ({ page }) => {
    await page.goto('/jobs');
    const search = page.locator('.navbar__search-input').first();
    await expect(search).toBeVisible();
    await search.fill('recruitment');
    await page.locator('.navbar__search-submit').first().click();
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.locator('.job-card').first()).toBeVisible({ timeout: 30_000 });
  });

  test('state browse route shows filtered jobs', async ({ page }) => {
    await page.goto('/state/up');
    await expect(page).toHaveURL(/\/state\/up/);
    await expect(page.locator('.job-card').first()).toBeVisible({ timeout: 30_000 });
  });

  test('latest notifications page loads table', async ({ page }) => {
    await page.goto('/jobs/latest-notifications');
    await expect(page.locator('.latest-notif-page, .latest-notif-table, table').first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
