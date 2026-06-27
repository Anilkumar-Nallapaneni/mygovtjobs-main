import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('accessibility', () => {
  test('home has no critical axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('.job-card').first()).toBeVisible({ timeout: 30_000 });

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });
});
