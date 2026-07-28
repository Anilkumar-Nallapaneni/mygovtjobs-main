import { expect, test, type Page } from '@playwright/test';

async function readHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>('*')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${
            typeof element.className === 'string' && element.className
              ? `.${element.className.trim().split(/\s+/).join('.')}`
              : ''
          }`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter(({ left, right }) => left < -1 || right > clientWidth + 1)
      .slice(0, 8);

    return {
      amount: document.documentElement.scrollWidth - clientWidth,
      offenders,
    };
  });
}

test.describe('mobile critical path', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('home and job detail fit the viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();

    const testCard = page.getByTestId('job-card-e2e-test-job');
    await expect(testCard).toBeVisible({ timeout: 30_000 });

    const homeOverflow = await readHorizontalOverflow(page);
    expect(homeOverflow.amount, JSON.stringify(homeOverflow.offenders)).toBeLessThanOrEqual(1);

    await testCard.click();
    await expect(page).toHaveURL(/\/jobs\/e2e-test-job/);
    await expect(page.locator('.job-detail-panel, .job-detail-hero').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[data-testid="official-apply-link"]:visible').first()).toBeVisible();

    const detailOverflow = await readHorizontalOverflow(page);
    expect(detailOverflow.amount, JSON.stringify(detailOverflow.offenders)).toBeLessThanOrEqual(1);
  });
});
