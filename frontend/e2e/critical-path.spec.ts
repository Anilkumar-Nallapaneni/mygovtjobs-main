import { expect, test } from '@playwright/test';

const SUBSCRIBE_DISMISSED_KEY = 'mygovtjobs-subscribe-dismissed';

test.describe('critical user path', () => {
  test('home → job detail → official apply link', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, String(Date.now()));
    }, SUBSCRIBE_DISMISSED_KEY);

    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();

    const testCard = page.getByTestId('job-card-e2e-test-job');
    await expect(testCard).toBeVisible({ timeout: 30_000 });
    const testCardAction = testCard.locator('.job-card__action');
    await expect(testCardAction).toBeVisible({ timeout: 30_000 });
    await testCardAction.click();

    await expect(page).toHaveURL(/\/jobs\/e2e-test-job/);
    await expect(page.locator('.job-detail-panel, .job-detail-hero').first()).toBeVisible({
      timeout: 30_000,
    });

    const applyLink = page.getByTestId('official-apply-link').first();
    await expect(applyLink).toBeVisible({ timeout: 15_000 });
    await expect(applyLink).toHaveAttribute('href', 'https://example.gov.in/apply');
    const href = await applyLink.getAttribute('href');
    expect(href).not.toMatch(/freejobalert|sarkariresult|naukri/i);
  });
});
