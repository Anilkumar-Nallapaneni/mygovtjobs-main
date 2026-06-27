import { expect, test } from '@playwright/test';

test.describe('critical user path', () => {
  test('home → job detail → official apply link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();
    const firstCard = page.locator('.job-card').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    await firstCard.click();

    await expect(page).toHaveURL(/\/jobs\/.+/);
    await expect(page.locator('.job-detail-panel, .job-detail-hero').first()).toBeVisible({
      timeout: 30_000,
    });

    const applyLink = page.locator('.job-detail-sticky-bar__apply, .job-detail-actions a').first();
    await expect(applyLink).toBeVisible({ timeout: 15_000 });
    const href = await applyLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toMatch(/freejobalert|sarkariresult|naukri/i);
    expect(href).toMatch(/^https?:\/\//i);
  });
});
