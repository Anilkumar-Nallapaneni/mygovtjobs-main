import { expect, test } from '@playwright/test';

const SAMPLE_SLUG =
  'district-panchayat-kabirdham-accounts-cum-mis-assistant-recruitment-2026-apply-o-ad3a3a86';

test.describe('job detail flows', () => {
  test('opens job detail from home card click', async ({ page }) => {
    await page.goto('/jobs');
    const firstCard = page.locator('.job-card').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/jobs\/.+/);
    await expect(page.locator('.job-detail-panel, .job-detail-hero').first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('direct slug URL renders detail page', async ({ page }) => {
    await page.goto(`/jobs/${SAMPLE_SLUG}`);
    await expect(page.locator('.job-detail-panel, .job-detail-hero, .job-detail-shell').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('unknown slug shows not-found fallback', async ({ page }) => {
    await page.goto('/jobs/this-slug-does-not-exist-00000000');
    await expect(page.getByText(/not found|no longer listed/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.job-detail-back-btn')).toBeVisible();
  });
});
