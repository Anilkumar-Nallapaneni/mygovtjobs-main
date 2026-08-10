import { expect, test } from '@playwright/test';

const SAMPLE_SLUG = 'e2e-test-job';
const SUBSCRIBE_DISMISSED_KEY = 'mygovtjobs-subscribe-dismissed';

test.describe('job detail flows', () => {
  test('opens job detail from home card click', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, String(Date.now()));
    }, SUBSCRIBE_DISMISSED_KEY);

    await page.goto('/jobs');
    const firstCardAction = page.locator('article.job-card--clickable .job-card__action').first();
    await expect(firstCardAction).toBeVisible({ timeout: 30_000 });
    await firstCardAction.click();
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
