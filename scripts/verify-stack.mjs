#!/usr/bin/env node
/**
 * Quick stack verification — run from repo root: npm run verify
 * Static assets are checked from disk; live HTTP checks run when dev server is up.
 */
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const checks = []

function ok(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const icon = pass ? '✓' : '✗'
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function fetchOk(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function staticLiveJobsOk() {
  const path = join(root, 'frontend/public/data/live-jobs.json')
  if (!existsSync(path)) return false
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'))
    const items = Array.isArray(data) ? data : data.items
    return Array.isArray(items) && items.length > 0
  } catch {
    return false
  }
}

ok('frontend/src/App.tsx', existsSync(join(root, 'frontend/src/App.tsx')))
ok('frontend/public/india.svg', existsSync(join(root, 'frontend/public/india.svg')))
ok('frontend/src/hooks/useLiveJobs.ts', existsSync(join(root, 'frontend/src/hooks/useLiveJobs.ts')))
ok('frontend/src/lib/supabase.ts', existsSync(join(root, 'frontend/src/lib/supabase.ts')))
ok('weekly portal audit workflow', existsSync(join(root, '.github/workflows/weekly-portal-audit.yml')))
ok('admin dashboard page', existsSync(join(root, 'frontend/src/pages/AdminDashboardPage.tsx')))
ok('frontend/public/data/live-jobs.json', existsSync(join(root, 'frontend/public/data/live-jobs.json')))
ok('frontend/public/data/live-jobs-list.json', existsSync(join(root, 'frontend/public/data/live-jobs-list.json')))
ok('frontend/public/sitemap.xml', existsSync(join(root, 'frontend/public/sitemap.xml')))
ok('frontend/public/robots.txt', existsSync(join(root, 'frontend/public/robots.txt')))

try {
  const { execSync } = await import('node:child_process')
  execSync('node scripts/check-frontend-hygiene.mjs', { cwd: root, stdio: 'pipe' })
  ok('frontend/src TS-only', true)
} catch {
  ok('frontend/src TS-only', false)
}

const envLocal = join(root, 'frontend/.env.local')
if (existsSync(envLocal)) {
  const text = readFileSync(envLocal, 'utf8')
  ok('VITE_SUPABASE_URL set', /VITE_SUPABASE_URL=\s*https:\/\//.test(text))
} else {
  ok('frontend/.env.local (optional)', false, 'copy from frontend/.env.example for Supabase')
}

const frontendDepsPath = existsSync(join(root, 'frontend/node_modules'))
  ? 'frontend/node_modules'
  : existsSync(join(root, 'node_modules'))
    ? 'root workspace node_modules'
    : ''
ok('frontend dependencies installed', Boolean(frontendDepsPath), frontendDepsPath || 'run npm ci from the repo root')
ok('live-jobs.json valid (static)', staticLiveJobsOk())

const devPort = 2222
const devUp = await fetchOk(`http://localhost:${devPort}/`)
if (devUp) {
  ok(`Frontend http://localhost:${devPort}`, true)
  ok(`India map SVG :${devPort}`, await fetchOk(`http://localhost:${devPort}/india.svg`))
  ok(`Live jobs JSON :${devPort}`, await fetchOk(`http://localhost:${devPort}/data/live-jobs.json`))
} else {
  ok(`Frontend http://localhost:${devPort} (optional)`, true, 'static checks used — run npm run dev for live HTTP probe')
}

const failed = checks.filter((c) => !c.pass).length
console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
process.exitCode = failed > 0 ? 1 : 0
