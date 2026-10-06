#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(process.cwd());
const publicDir = join(root, 'frontend', 'public');
const required = [
  'robots.txt',
  'sitemap.xml',
  'sitemap-index.xml',
  'sitemaps/static-pages.xml',
  'sitemaps/jobs-active.xml',
  'data/live-jobs.json',
];
let failed = false;
for (const rel of required) {
  const path = join(publicDir, rel);
  if (!existsSync(path)) { console.error(`MISSING ${rel}`); failed = true; continue; }
  console.log(`OK ${rel}`);
}
const jobs = JSON.parse(readFileSync(join(publicDir, 'data/live-jobs.json'), 'utf8'));
const activeXml = readFileSync(join(publicDir, 'sitemaps/jobs-active.xml'), 'utf8');
const count = Array.isArray(jobs.items) ? jobs.items.length : 0;
const urls = (activeXml.match(/<loc>/g) || []).length;
console.log(`Snapshot jobs: ${count}`);
console.log(`Active sitemap URLs: ${urls}`);
if (count && urls < count) {
  console.warn('WARN: active sitemap is smaller than the raw snapshot. This is expected when the publication gate excludes expired/unverified/incomplete records; compare against the approved-live query, not raw snapshot length.');
}
const robots = readFileSync(join(publicDir, 'robots.txt'), 'utf8');
if (!robots.includes('/sitemap-index.xml')) {
  console.error('FAIL: robots.txt does not reference sitemap-index.xml');
  failed = true;
}
process.exit(failed ? 1 : 0);
