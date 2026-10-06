#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const checks = [];
const ok = (name, pass, detail='') => { checks.push({name, pass, detail}); };

const stateFile = join(root, 'frontend/src/data/states.ts');
const migration = join(root, 'database/migrations/042_india_explorer_backend.sql');
const indiaPage = join(root, 'frontend/src/pages/IndiaExplorerPage.tsx');
const districtPage = join(root, 'frontend/src/pages/DistrictExplorerPage.tsx');
const indiaRoute = join(root, 'backend/app/routes/india.py');
const sitemap = join(root, 'frontend/public/sitemaps/states.xml');

for (const [label, file] of [
  ['State master', stateFile], ['India migration', migration], ['India page', indiaPage],
  ['District page', districtPage], ['India API route', indiaRoute], ['State sitemap', sitemap],
]) ok(label, existsSync(file), file);

if (existsSync(stateFile)) {
  const text = readFileSync(stateFile, 'utf8');
  const ids = [...text.matchAll(/\{id:"([a-z]+)"/g)].map(m => m[1]).filter(id => id !== 'ne');
  ok('Exactly 36 public States/UTs', new Set(ids).size === 36, `count=${new Set(ids).size}`);
}
if (existsSync(migration)) {
  const text = readFileSync(migration, 'utf8');
  const values = text.slice(text.indexOf('VALUES\n'), text.indexOf('ON CONFLICT (id)'));
  const ids = [...values.matchAll(/\('([a-z]{2})','([^']+)'/g)].map(m => m[1]);
  ok('Exactly 36 seeded States/UTs', new Set(ids).size === 36, `count=${new Set(ids).size}`);
  ok('LGD source registered', text.includes("Local Government Directory (LGD)"));
  ok('Open Government Data source registered', text.includes("Open Government Data Platform India"));
}
if (existsSync(indiaRoute)) {
  const text = readFileSync(indiaRoute, 'utf8');
  ok('Global district endpoint', text.includes('@router.get("/districts")'));
  ok('State job count', text.includes('AS job_count'));
  ok('Verified-only directory filters', text.includes("verification_status='verified'"));
}
if (existsSync(indiaPage)) {
  const text = readFileSync(indiaPage, 'utf8');
  ok('India page has district glance', text.includes('Districts at a glance'));
  ok('India page renders all 36 master units', text.includes('BROWSE_STATES'));
}
if (existsSync(sitemap)) {
  const text = readFileSync(sitemap, 'utf8');
  const indiaStates = (text.match(/<loc>[^<]*\/india\/[a-z]{2}<\/loc>/g) || []).length;
  ok('Sitemap contains 36 India state URLs', indiaStates === 36, `count=${indiaStates}`);
}

const failures = checks.filter(c => !c.pass);
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
console.log(`India platform audit: ${failures.length ? 'FAIL' : 'PASS'} (${checks.length} checks)`);
process.exit(failures.length ? 1 : 0);
