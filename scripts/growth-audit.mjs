#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'frontend/public/data/live-jobs.json');
const sitemapDir = join(root, 'frontend/public/sitemaps');
const envExample = join(root, 'frontend/.env.example');

function loadJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}
function countUrls(name) {
  const path = join(sitemapDir, name);
  if (!existsSync(path)) return 0;
  return (readFileSync(path, 'utf8').match(/<url>/g) || []).length;
}
function pct(n, d) { return d ? `${((n / d) * 100).toFixed(1)}%` : '0.0%'; }

const payload = loadJson(dataPath, { items: [] });
const jobs = Array.isArray(payload.items) ? payload.items : [];
const live = jobs.filter(j => String(j.status || '').toLowerCase() === 'live');
const verified = live.filter(j => ['VERIFIED','PARTIALLY_VERIFIED'].includes(String(j.verification_status || '').toUpperCase()));
const published = live.filter(j => j.published_to_site === true);
const complete70 = live.filter(j => Number(j.completeness_score || 0) >= 70);
const confident90 = live.filter(j => Number(j.publication_confidence || 0) >= 90);
const withApply = live.filter(j => /^https?:\/\//i.test(String(j.apply_url || j.applyUrl || j.officialUrl || '')));
const withLastDate = live.filter(j => /^\d{4}-\d{2}-\d{2}/.test(String(j.last_date || j.lastDate || '')));
const activeSitemap = countUrls('jobs-active.xml');
const archiveSitemap = countUrls('jobs-archive.xml');
const env = existsSync(envExample) ? readFileSync(envExample, 'utf8') : '';

console.log('\nLiveGovtJobs Growth Audit');
console.log('=========================');
console.log(`Snapshot jobs:             ${jobs.length}`);
console.log(`Live jobs:                 ${live.length}`);
console.log(`Verified live:             ${verified.length} (${pct(verified.length, live.length)})`);
console.log(`Published live:            ${published.length} (${pct(published.length, live.length)})`);
console.log(`Completeness >= 70:        ${complete70.length} (${pct(complete70.length, live.length)})`);
console.log(`Confidence >= 90:          ${confident90.length} (${pct(confident90.length, live.length)})`);
console.log(`Has apply/official URL:    ${withApply.length} (${pct(withApply.length, live.length)})`);
console.log(`Has last date:             ${withLastDate.length} (${pct(withLastDate.length, live.length)})`);
console.log(`Active sitemap URLs:       ${activeSitemap}`);
console.log(`Archive sitemap URLs:      ${archiveSitemap}`);
console.log(`AdSense env documented:    ${env.includes('VITE_ADSENSE_CLIENT=') ? 'yes' : 'no'}`);

console.log('\nPriority checks');
const checks = [
  [live.length >= 300, 'Grow verified live-job inventory to 300+; target 20–50 verified updates/day.'],
  [archiveSitemap >= 500, 'Build/preserve useful expired recruitment archive pages; target 500+ then 1,000+.'],
  [withApply.length === live.length, 'Every live job needs a valid official/apply URL.'],
  [withLastDate.length === live.length, 'Every live recruitment needs a reliable closing date or an explicit reviewed exception.'],
  [activeSitemap === published.length, 'Rebuild sitemap after every publication batch and verify sitemap/job counts.'],
];
for (const [ok, message] of checks) console.log(`${ok ? 'PASS' : 'ACTION'}  ${message}`);

console.log('\nNext commands');
console.log('  npm run pipeline:daily');
console.log('  npm run jobs:audit:strict');
console.log('  npm run build:sitemap');
console.log('  npm run growth:audit');
console.log('  npm run build');
