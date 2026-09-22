import {spawnSync} from 'node:child_process';
const mode=process.argv.includes('--apply')?'apply':'audit';
const phases = mode==='audit' ? [
 ['P0','npm run p0:audit'],
 ['P1','npm run audit:official-sites'],
 ['P2','npm run audit:detail-coverage'],
 ['P3','npm run build:official-archives'],
 ['P4','npm run build:sitemap && npm run growth:audit'],
 ['P5','npm run i18n:audit'],
 ['P6','npm run type-check'],
 ['P7','npm run growth:audit'],
 ['P8','npm run growth:audit'],
 ['P9','node scripts/audit-monetization-readiness.mjs'],
] : [
 ['P0','npm run p0:repair'],
 ['P1','npm run health:sources && npm run export:source-health'],
 ['P2','npm run enrich:jobs:all && npm run sync:job-children'],
 ['P3','npm run data:populate-recruitment-events:apply && npm run build:official-archives && npm run export:recruitment-events'],
 ['P4','npm run build:org-index && npm run build:sitemap'],
 ['P5','npm run i18n:generate && npm run i18n:fill && npm run i18n:audit'],
 ['P6','npm run build:live-jobs-list && npm run build:live-jobs-bootstrap'],
 ['P7','npm run alerts:deliver'],
 ['P8','npm run growth:audit'],
 ['P9','node scripts/audit-monetization-readiness.mjs'],
 ['VERIFY','npm run verify:live-jobs && npm run validate && npm run build'],
];
for(const [name,cmd] of phases){
 console.log(`\n========== ${name} ${mode.toUpperCase()} ==========`);
 const r=spawnSync(cmd,{cwd:process.cwd(),shell:true,stdio:'inherit',env:process.env});
 if((r.status??1)!==0){ console.error(`${name} failed with code ${r.status}`); process.exit(r.status??1); }
}
console.log(`\nAll ${mode} phases completed.`);
