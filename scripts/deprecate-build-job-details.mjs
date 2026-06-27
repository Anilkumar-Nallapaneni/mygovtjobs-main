#!/usr/bin/env node
/**
 * build:job-details is deprecated — use Agent 2+3 (DB-backed pipeline).
 *
 *   npm run pdf:read:live && npm run job:details
 *   npm run weekly:enrich:ci          # CI-sized batch (50 jobs)
 *   npm run pipeline:live               # skip ingest, full PDF + detail pass
 *
 * Legacy static-only script (live-jobs.json, no DB):
 *   node scripts/run-python.mjs scripts/build-pdf-job-details.py
 */
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

console.warn(
  '\n⚠ DEPRECATED: npm run build:job-details\n' +
    '  Use: npm run pdf:read:live && npm run job:details\n' +
    '  Or:  npm run weekly:enrich:ci (50 jobs, same as CI)\n' +
    '  Legacy (no DB): node scripts/run-python.mjs scripts/build-pdf-job-details.py\n',
)

function run(script) {
  const r = spawnSync(npm, ['run', script], { cwd: root, stdio: 'inherit', shell: true })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('pdf:read:live')
run('job:details')
console.log('\n✓ Replaced build:job-details with pdf:read:live + job:details')
