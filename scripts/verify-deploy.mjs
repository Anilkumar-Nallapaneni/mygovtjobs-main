#!/usr/bin/env node
/**
 * Static deploy readiness — no Vercel login or backend required.
 *   npm run deploy:verify
 * Optional live probe: DEPLOY_URL=https://www.livegovtjobs.com npm run deploy:verify
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { verifyLiveJobsSnapshot } from './verify-live-jobs-snapshot.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const checks = []

function ok(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const icon = pass ? '✓' : '✗'
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`)
}

function loadEnv(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function liveJobsStats() {
  const path = join(root, 'frontend/public/data/live-jobs.json')
  if (!existsSync(path)) return null
  const data = readJson(path)
  if (!data) return null
  const items = Array.isArray(data) ? data : data.items
  if (!Array.isArray(items)) return null
  const now = Date.now()
  let live = 0
  for (const row of items) {
    const status = String(row?.status || 'live').toLowerCase()
    if (status === 'expired') continue
    const dl = row?.last_date || row?.lastDate
    if (dl) {
      const t = Date.parse(String(dl))
      if (Number.isFinite(t) && t < now) continue
    }
    live += 1
  }
  return { total: items.length, live }
}

function archiveStats() {
  const dir = join(root, 'frontend/public/data/official-archives')
  if (!existsSync(dir)) return null
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  let total = 0
  for (const file of files) {
    const data = readJson(join(dir, file))
    const items = Array.isArray(data) ? data : data?.items
    if (Array.isArray(items)) total += items.length
  }
  return { files: files.length, items: total }
}

console.log('=== Deploy verification (static) ===\n')

const jobs = liveJobsStats()
ok('live-jobs.json present', Boolean(jobs), jobs ? `${jobs.total} rows, ~${jobs.live} non-expired` : 'run sync:all')

const snapshot = verifyLiveJobsSnapshot({ strict: true })
ok(
  'live-jobs snapshot quality',
  snapshot.ok,
  snapshot.ok
    ? `${snapshot.fullVac?.withVac ?? 0} jobs with vacancies`
    : snapshot.issues[0] || 'run npm run build:live-jobs-list'
)
for (const w of snapshot.warnings) {
  ok(`live-jobs snapshot (${w})`, true, 'warning only')
}

const syncPath = join(root, 'frontend/public/data/daily-sync-state.json')
const sync = existsSync(syncPath) ? readJson(syncPath) : null
ok(
  'daily-sync-state.json',
  Boolean(sync?.completedAt || sync?.status === 'completed'),
  sync?.completedAtIst || sync?.status || 'missing'
)

const archives = archiveStats()
ok(
  'official-archives/*.json',
  Boolean(archives && archives.files >= 5),
  archives ? `${archives.files} files, ${archives.items} archive rows` : 'run build:official-archives'
)

const feedPath = join(root, 'frontend/public/data/official-feed-items.json')
const feedAlt = join(root, 'frontend/public/data/official-feed.json')
const feed = existsSync(feedPath) ? readJson(feedPath) : existsSync(feedAlt) ? readJson(feedAlt) : null
const feedItems = Array.isArray(feed) ? feed : feed?.items
ok(
  'official-feed-items.json',
  Array.isArray(feedItems) && feedItems.length > 0,
  feedItems ? `${feedItems.length} feed items` : 'run fetch:official:feeds'
)

const vercelJson = readJson(join(root, 'vercel.json'))
const dataCache = vercelJson?.headers?.some(
  (h) => h.source?.includes('/data/') && h.headers?.some((x) => x.key === 'Cache-Control')
)
ok('vercel.json /data/ Cache-Control', Boolean(dataCache), 'prevents stale empty JSON cache')

const spaRewrite = vercelJson?.rewrites?.find((r) => r.source === '/(.*)' || r.source === '/:path*')
ok(
  'vercel.json SPA fallback destination is /',
  spaRewrite?.destination === '/',
  spaRewrite?.destination === '/index.html'
    ? 'cleanUrls 404s rewrites to /index.html — use destination /'
    : spaRewrite?.destination || 'missing catch-all rewrite'
)

const fe = loadEnv(join(root, 'frontend/.env.local'))
const hasSupabase = fe.VITE_SUPABASE_URL?.startsWith('https://') && fe.VITE_SUPABASE_ANON_KEY?.length > 20
ok('frontend/.env.local Supabase', hasSupabase, hasSupabase ? 'URL + anon key set' : 'copy frontend/.env.local.example')

const jobsSource = (fe.VITE_JOBS_SOURCE || 'auto').toLowerCase()
ok(
  'VITE_JOBS_SOURCE',
  ['supabase', 'static', 'api', 'auto'].includes(jobsSource),
  jobsSource === 'supabase' ? 'supabase (recommended prod)' : `${jobsSource} — set supabase for production`
)

if (fe.VITE_GA_MEASUREMENT_ID?.startsWith('G-')) {
  ok('VITE_GA_MEASUREMENT_ID', true, 'GA4 configured locally')
} else {
  ok('VITE_GA_MEASUREMENT_ID (optional)', true, 'not set — analytics events no-op until configured')
}

const distIndex = join(root, 'frontend/dist/index.html')
ok('frontend build artifact', existsSync(distIndex), existsSync(distIndex) ? 'run npm run build before deploy' : 'npm run build')

const deployUrl = (process.env.DEPLOY_URL || '').replace(/\/$/, '')
if (deployUrl) {
  console.log(`\n── Live probe: ${deployUrl} ──`)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${deployUrl}/data/live-jobs.json`, { signal: controller.signal })
    ok(`${deployUrl}/data/live-jobs.json`, res.ok, `HTTP ${res.status}`)
    if (res.ok) {
      const body = await res.json()
      const items = Array.isArray(body) ? body : body?.items
      ok('Production JSON has jobs', Array.isArray(items) && items.length > 0, `${items?.length ?? 0} items`)
    }
    const spaRes = await fetch(`${deployUrl}/results`, { signal: controller.signal })
    const spaBody = spaRes.ok ? await spaRes.text() : ''
    ok(
      `${deployUrl}/results SPA`,
      spaRes.ok && spaBody.includes('id="root"') && !spaBody.includes('404: NOT_FOUND'),
      spaRes.ok ? 'SPA shell' : `HTTP ${spaRes.status}`
    )
  } catch (e) {
    ok(`${deployUrl} reachable`, false, e instanceof Error ? e.message : String(e))
  } finally {
    clearTimeout(timer)
  }
} else {
  console.log('\n── Live probe skipped ──')
  console.log('  Set DEPLOY_URL=https://www.livegovtjobs.com to verify production after deploy')
}

console.log('\n── Next steps ──')
console.log('  1. npm run build && npm run vercel:deploy')
console.log('  2. npm run vercel:env:check  (production env on Vercel)')
console.log('  3. DEPLOY_URL=https://www.livegovtjobs.com npm run deploy:verify')
console.log('  Full preflight: npm run go-live:check')

const failed = checks.filter((c) => !c.pass).length
console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
process.exitCode = failed > 0 ? 1 : 0
