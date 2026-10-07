import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

// Opt-in read-only audit of the real catalog and local API; no demo fixtures.
test.describe('production repository responsive audit', () => {
  test.skip(!process.env.PRODUCTION_AUDIT_URL, 'Requires the running real frontend and read-only API');
  test('public route inventory smoke', async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const paths = ['/', '/jobs', '/jobs/all-india', '/jobs/latest-notifications', '/latest-notifications', '/india', '/india-map', '/india/ka', '/india/ka/education', '/education', '/education/mock-tests', '/education/dashboard', '/career', '/explore', '/qualifications', '/professions', '/organizations', '/states', '/boards', '/categories', '/state/ka', '/board/ssc', '/category/ssc', '/profession/medical', '/qualification/graduate', '/results', '/results/admit-card', '/results/answer-key', '/alerts', '/exams', '/exam-calendar', '/faq', '/guide/how-to-apply', '/guide/exam-preparation', '/privacy', '/terms', '/about', '/contact', '/sitemap', '/disclaimer', '/account', '/account/bookmarks', '/admission', '/scholarships', '/yojana', '/latest-results', '/admit-cards', '/answer-keys', '/upcoming-exams', '/designations', '/designation/clerk'];
    for (const path of paths) {
      await page.goto(`${process.env.PRODUCTION_AUDIT_URL}${path}`);
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('#main-content h1:visible, #main-content h2:visible').first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
  for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    test(`${width}x${height}: home, search, India, state, district and detail`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height });
      const catalog = JSON.parse(readFileSync('public/data/live-jobs.json', 'utf8'));
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const origin = process.env.PRODUCTION_AUDIT_URL!;
      const response = await page.request.get('http://127.0.0.1:8000/api/india/districts?state_id=ka');
      expect(response.ok()).toBeTruthy();
      const districts = await response.json();
      expect(districts.total).toBe(31);
      for (const path of ['/', '/jobs?q=engineer', '/india', '/india/ka', `/india/ka/district/${districts.items[0].id}`, `/jobs/${catalog.items[0].slug}`]) {
        await page.goto(`${origin}${path}`);
        await expect(page.locator('#main-content')).toBeVisible();
        await expect(page.locator('#main-content h1:visible, #main-content h2:visible').first()).toBeVisible({ timeout: 30_000 });
        if (path === '/india/ka') await expect(page.locator('.state-explorer__district-card')).toHaveCount(31);
        if (path.includes('/district/')) await expect(page.locator('h1')).toContainText(districts.items[0].name);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, path).toBeLessThanOrEqual(1);
        if (path === '/' || path === '/india/ka') {
          if (path === '/') await expect(page.locator('.home-discovery-block__placeholder')).toHaveCount(0);
          await page.screenshot({ path: testInfo.outputPath(`${path === '/' ? 'home' : 'state'}-${width}.png`), fullPage: true });
          const accessibility = await new AxeBuilder({ page }).analyze();
          await testInfo.attach(`${path}-axe`, { body: JSON.stringify(accessibility.violations), contentType: 'application/json' });
          expect(accessibility.violations.filter(v => v.impact === 'critical')).toEqual([]);
        }
      }
      expect(errors).toEqual([]);
    });
  }
});
