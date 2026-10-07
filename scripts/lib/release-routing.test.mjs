import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const spa = config.rewrites.filter(rule => rule.destination === '/');
const matches = (source, path) => source.endsWith('/:path*')
  ? path === source.slice(0, -'/:path*'.length) || path.startsWith(`${source.slice(0, -'/:path*'.length)}/`)
  : source === path;

test('clean URL SPA rewrites use extensionless destinations', () => {
  assert.equal(config.cleanUrls, true);
  assert.equal(config.outputDirectory, 'frontend/dist');
  assert.ok(spa.length > 0);
  assert.ok(config.rewrites.every(rule => !rule.destination.endsWith('.html')));
});
test('India, district, education and search deep links have scoped rewrites', () => {
  for (const path of ['/india', '/india/ka', '/india/ka/district/persisted-id', '/india/ka/district/persisted-id/education', '/education', '/education/careers/engineering', '/search']) {
    assert.ok(spa.some(rule => matches(rule.source, path)), path);
  }
});
test('SPA rules do not capture API, sitemap, robots, assets or prerendered job details', () => {
  for (const path of ['/api/og', '/api/india/states', '/robots.txt', '/sitemap-index.xml', '/sitemaps/districts.xml', '/assets/index.js', '/data/live-jobs.json', '/jobs/real-job-slug', '/unknown']) {
    assert.ok(!spa.some(rule => matches(rule.source, path)), path);
  }
  assert.ok(config.rewrites.some(rule => rule.source === '/og/job.svg' && rule.destination === '/api/og'));
});
