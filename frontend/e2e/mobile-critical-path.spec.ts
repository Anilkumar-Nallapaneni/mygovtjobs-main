import { expect, test } from '@playwright/test';

test.describe('mobile critical path', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('home and job detail fit the viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();

    const testCard = page.getByTestId('job-card-e2e-test-job');
    await expect(testCard).toBeVisible({ timeout: 30_000 });

    const homeOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(homeOverflow).toBeLessThanOrEqual(1);

    await testCard.click();
    await expect(page).toHaveURL(/\/jobs\/e2e-test-job/);
    await expect(page.locator('.job-detail-panel, .job-detail-hero').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[data-testid="official-apply-link"]:visible').first()).toBeVisible();

    const detailOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(detailOverflow).toBeLessThanOrEqual(1);
  });
});
