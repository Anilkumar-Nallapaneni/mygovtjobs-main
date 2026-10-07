import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(root, 'data', 'india', 'normalized', 'lgd-districts.csv');
const migration = path.join(root, 'database', 'migrations', '042_india_explorer_backend.sql');
const api = path.join(root, 'backend', 'app', 'routes', 'india.py');
const statePage = path.join(root, 'frontend', 'src', 'pages', 'StateExplorerPage.tsx');
const checks = [];
const add=(name,ok,detail)=>checks.push({name,ok,detail});
add('LGD district CSV exists', fs.existsSync(csvPath), csvPath);
const validation = spawnSync(process.execPath, ['scripts/run-python.mjs', 'scripts/india/validate_lgd_districts.py'], {
  cwd: root, encoding: 'utf8', timeout: 30000,
});
add('CSV reconciles to immutable XLSX, mapping and provenance', validation.status === 0,
  validation.status === 0 ? 'source validator PASS' : (validation.stderr || validation.error?.message || 'validator failed').trim());
add('Explicit state mapping exists', fs.existsSync(path.join(root, 'data/india/lgd-state-mapping.json')), '36 canonical States/UTs');
add('Additive LGD migration exists', fs.existsSync(path.join(root, 'database/migrations/043_india_lgd_district_identity.sql')), '043, not applied by this audit');
add('India backend route exists', fs.existsSync(api), api);
add('India backend migration exists', fs.existsSync(migration), migration);
add('State district UI exists', fs.existsSync(statePage), statePage);
console.log('=== India data readiness ===');
for (const c of checks) console.log(`${c.ok?'PASS':'FAIL'} ${c.name} — ${c.detail}`);
const failures=checks.filter(c=>!c.ok);
if(failures.length){
  console.error('\nSOURCE DATA READINESS: FAIL');
  process.exitCode=1;
}else console.log('\nSOURCE DATA READINESS: PASS');
console.log('Production import remains pending approval. This source audit does not certify database import or migration status.');
