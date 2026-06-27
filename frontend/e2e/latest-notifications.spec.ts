import { expect, test } from '@playwright/test';

test.describe('latest notifications filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs/latest-notifications');
    await expect(page.locator('.latest-notif-page')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.latest-notif__state-filter')).toBeVisible();
  });

  test('state chip updates URL without reload', async ({ page }) => {
    const hp = page.locator('.latest-notif__state-filter').getByRole('tab', { name: /^HP\b/i });
    await expect(hp).toBeVisible();
    await hp.click();
    await expect(page).toHaveURL(/[?&]state=hp(?:&|$)/);
    await expect(hp).toHaveAttribute('aria-selected', 'true');
  });

  test('medical category chip sets profession query', async ({ page }) => {
    const medical = page.getByRole('tab', { name: /Medical/i });
    await expect(medical).toBeVisible();
    await medical.click();
    await expect(page).toHaveURL(/[?&]profession=medical(?:&|$)/);
  });

  test('education chip sets filter query', async ({ page }) => {
    const graduate = page.locator('.latest-notif__edu-filter').getByRole('button', { name: /Graduate/i });
    await expect(graduate.first()).toBeVisible({ timeout: 15_000 });
    await graduate.first().click();
    await expect(page).toHaveURL(/[?&]filter=graduate(?:&|$)/);
  });

  test('simple view toggle keeps filters in URL', async ({ page }) => {
    await page.goto('/jobs/latest-notifications?state=up&profession=medical');
    const simpleBtn = page.getByRole('button', { name: /^Simple$/i });
    await expect(simpleBtn).toBeVisible();
    await simpleBtn.click();
    await expect(page).toHaveURL(/view=simple/);
    await expect(page).toHaveURL(/state=up/);
    await expect(page).toHaveURL(/profession=medical/);
    await expect(page.locator('.latest-notif__table--simple')).toBeVisible();
  });
});
