import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('accessibility', () => {
  test('home has no critical axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('.job-card').first()).toBeVisible({ timeout: 30_000 });

    const results = await new AxeBuilder({ page }).analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  test('faq page has no critical axe violations', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.locator('.faq-page__list')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  test('job detail has no critical axe violations', async ({ page }) => {
    await page.goto('/');
    const firstJob = page.locator('.job-card').first();
    await expect(firstJob).toBeVisible({ timeout: 30_000 });
    await firstJob.click();
    await expect(page.locator('.job-detail-page, .job-detail-page--premium')).toBeVisible({ timeout: 30_000 });

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });
});
