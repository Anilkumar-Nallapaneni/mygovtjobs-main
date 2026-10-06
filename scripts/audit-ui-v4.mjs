import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['premium CSS exists', 'frontend/src/styles/premium-v4.css'],
  ['main imports premium CSS', 'frontend/src/main.tsx'],
  ['India Explorer page', 'frontend/src/pages/IndiaExplorerPage.tsx'],
  ['State Explorer page', 'frontend/src/pages/StateExplorerPage.tsx'],
  ['District Explorer page', 'frontend/src/pages/DistrictExplorerPage.tsx'],
  ['Category card', 'frontend/src/components/india/ExplorerCategoryCard.tsx'],
  ['India map', 'frontend/src/components/Maps/IndiaMap/IndiaMap.tsx'],
  ['design tokens', 'frontend/src/styles/tokens.css'],
  ['global styles', 'frontend/src/styles/global.css'],
];
let failed = 0;
for (const [name, rel] of checks) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
const css = fs.readFileSync(path.join(root, 'frontend/src/styles/premium-v4.css'), 'utf8');
for (const needle of ['@media (max-width: 700px)', 'prefers-reduced-motion', 'focus-visible', 'india-explorer__district-glance-grid', 'state-explorer__district-grid']) {
  const ok = css.includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'} CSS feature: ${needle}`);
  if (!ok) failed++;
}
process.exitCode = failed ? 1 : 0;
