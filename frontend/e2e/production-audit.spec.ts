import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const verifiedApiResponses = new Map<string, Promise<{ status: number; body: string }>>();

// Opt-in read-only audit of the real catalog and local API; no demo fixtures.
test.describe('production repository responsive audit', () => {
  test.skip(!process.env.PRODUCTION_AUDIT_URL, 'Requires the running real frontend and read-only API');
  test.beforeEach(async ({ page }) => {
    // Optional test-only bridge to the real read-only API. The static Vercel
    // artifact does not host FastAPI; this does not certify production API wiring.
    if (process.env.RELEASE_API_BRIDGE === '1') {
      await page.route('**/api/india/**', async route => {
        const url = new URL(route.request().url());
        const apiUrl = `http://127.0.0.1:8000${url.pathname}${url.search}`;
        if (!verifiedApiResponses.has(apiUrl)) {
          verifiedApiResponses.set(apiUrl, fetch(apiUrl, { signal: AbortSignal.timeout(20_000) }).then(async response => ({ status: response.status, body: await response.text() })));
        }
        const response = await verifiedApiResponses.get(apiUrl)!;
        await route.fulfill({ ...response, contentType: 'application/json' });
      });
    }
  });
  test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });
  test('release direct navigation and refresh preserve routes and static responses', async ({ page }) => {
    test.setTimeout(180_000);
    const origin = process.env.PRODUCTION_AUDIT_URL!;
    const response = await page.request.get('http://127.0.0.1:8000/api/india/districts?state_id=ka');
    const directory = await response.json();
    expect(directory.items.length).toBeGreaterThan(0);
    const catalog = JSON.parse(readFileSync('public/data/live-jobs.json', 'utf8'));
    const paths = ['/', '/jobs', '/search?q=engineer', '/india', '/india/ka', `/india/ka/district/${directory.items[0].id}`, `/jobs/${catalog.items[0].slug}`, '/education', '/exams', '/results', '/scholarships', '/yojana'];
    for (const path of paths) {
      expect((await page.goto(`${origin}${path}`))?.status()).toBe(200);
      await expect(page.locator('#main-content h1:visible, #main-content h2:visible').first()).toBeVisible();
      if (path.startsWith('/search')) await expect(page).toHaveURL(/\/jobs\?q=engineer$/);
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.locator('#main-content h1:visible, #main-content h2:visible').first()).toBeVisible();
    }
    for (const path of ['/robots.txt', '/sitemap-index.xml', '/sitemaps/jobs-active.xml', '/sitemaps/districts.xml']) {
      const asset = await page.request.get(`${origin}${path}`);
      expect(asset.status()).toBe(200);
      expect(await asset.text()).not.toContain('<div id="root"');
    }
  });
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
      expect(districts.total).toBe(districts.items.length);
      for (const path of ['/', '/jobs?q=engineer', '/india', '/india/ka', `/india/ka/district/${districts.items[0].id}`, `/jobs/${catalog.items[0].slug}`]) {
        await page.goto(`${origin}${path}`);
        await expect(page.locator('#main-content')).toBeVisible();
        await expect(page.locator('#main-content h1:visible, #main-content h2:visible').first()).toBeVisible({ timeout: 30_000 });
        if (path === '/india/ka') await expect(page.locator('.state-explorer__district-card')).toHaveCount(districts.total);
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
