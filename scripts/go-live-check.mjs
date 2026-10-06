#!/usr/bin/env node
/**
 * Pre-flight checks before production go-live.
 *   npm run go-live:check
 *
 * Optional live probes:
 *   API_HEALTH_URL=https://api.livegovtjobs.com/health npm run go-live:check
 *   SITEMAP_URL=https://www.livegovtjobs.com/sitemap.xml npm run go-live:check
 */
import { spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

async function probeUrl(label, url, { expectSubstr } = {}) {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    const body = await res.text()
    const ok = res.ok && (!expectSubstr || body.includes(expectSubstr))
    console.log(ok ? `✓ ${label}` : `✗ ${label}`)
    if (!ok) console.log(`  ${url} → HTTP ${res.status}`)
    return ok
  } catch (err) {
    console.log(`✗ ${label}`)
    console.log(`  ${url} → ${err.message}`)
    return false
  }
}

function run(label, cmd, args) {
  const npmCli = process.env.npm_execpath
  const invocation = npmCli && cmd === 'npm'
    ? { command: process.execPath, args: [npmCli, ...args] }
    : { command: cmd, args }
  const r = spawnSync(invocation.command, invocation.args, { cwd: root, encoding: 'utf8' })
  const ok = r.status === 0
  console.log(ok ? `✓ ${label}` : `✗ ${label}`)
  if (!ok && r.stdout) process.stdout.write(r.stdout)
  if (!ok && r.stderr) process.stderr.write(r.stderr)
  return ok
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

console.log('=== Go-live preflight ===\n')

const checks = [
  run('Env alignment', 'npm', ['run', 'env:check']),
  run('Supabase REST', 'npm', ['run', 'supabase:test']),
  run('Database (backend pooler)', 'npm', ['run', 'db:test']),
  run('Job quality audit', 'npm', ['run', 'jobs:audit']),
  run('Frontend build', 'npm', ['run', 'build']),
  run('Vercel env (jobs source)', 'npm', ['run', 'vercel:env:check']),
]

const be = loadEnv(join(root, 'backend', '.env'))
const fe = loadEnv(join(root, 'frontend', '.env.local'))

console.log('\n── Production readiness ──')

const adminKey = be.ADMIN_API_KEY || ''
if (!adminKey || adminKey === 'change-me-in-production') {
  console.log('✗ ADMIN_API_KEY — still default; run: npm run admin:key:generate')
} else {
  console.log('✓ ADMIN_API_KEY set (non-default)')
}

const cors = be.CORS_ORIGINS || ''
if (cors.includes('livegovtjobs.com')) {
  console.log('✓ CORS_ORIGINS includes livegovtjobs.com')
} else {
  console.log('⚠ CORS_ORIGINS — add https://www.livegovtjobs.com on Railway/Render (local .env may omit it)')
}

if (fe.VITE_GA_MEASUREMENT_ID?.startsWith('G-')) {
  console.log('✓ VITE_GA_MEASUREMENT_ID configured locally')
} else {
  console.log('⚠ GA4 — add VITE_GA_MEASUREMENT_ID=G-XXXX to frontend/.env.local then vercel:env:push:live')
}

if (fe.VITE_GOOGLE_SITE_VERIFICATION?.trim()) {
  console.log('✓ VITE_GOOGLE_SITE_VERIFICATION configured locally')
} else {
  console.log('⚠ Search Console verification — add VITE_GOOGLE_SITE_VERIFICATION to frontend/.env.local then redeploy')
}

const localApiUrl = fe.VITE_API_URL?.replace(/\/$/, '')

console.log('\n── Live probes (optional) ──')
const apiBaseUrl = (process.env.API_BASE_URL || 'https://api.livegovtjobs.com').replace(/\/$/, '')
const apiHealth = process.env.API_HEALTH_URL || `${apiBaseUrl}/health`
const sitemapUrl = process.env.SITEMAP_URL || 'https://www.livegovtjobs.com/sitemap.xml'
const siteUrl = (process.env.SITE_URL || 'https://www.livegovtjobs.com').replace(/\/$/, '')
const liveApiOk = await probeUrl('API /health', apiHealth, { expectSubstr: '"status"' })
await probeUrl('Public sitemap index', sitemapUrl, {
  expectSubstr: '<sitemapindex',
})
await probeUrl('SPA /results (not Vercel 404)', `${siteUrl}/results`, {
  expectSubstr: 'id="root"',
})
await probeUrl('SPA /results/admit-card', `${siteUrl}/results/admit-card`, {
  expectSubstr: 'id="root"',
})
if (localApiUrl && /localhost|127\.0\.0\.1/i.test(localApiUrl)) {
  console.log(`ℹ Local VITE_API_URL=${localApiUrl} is reserved for development; production probe uses ${apiBaseUrl}`)
}

if (be.SENTRY_DSN) {
  console.log('✓ SENTRY_DSN configured locally')
} else {
  console.log('⚠ Sentry — add SENTRY_DSN to backend/.env for production error tracking')
}

if (be.REDIS_URL) {
  console.log('✓ REDIS_URL configured — shared rate limiting enabled')
} else {
  console.log('⚠ Redis — set REDIS_URL on Railway/Render for multi-instance rate limits')
}

if (be.TURNSTILE_SECRET_KEY) {
  console.log('✓ TURNSTILE_SECRET_KEY set')
} else {
  console.log('⚠ Turnstile — optional bot protection; set TURNSTILE_SECRET_KEY + VITE_TURNSTILE_SITE_KEY')
}

if (liveApiOk) {
  console.log('\n✓ Production API health endpoint is reachable')
} else {
  console.log('\n⚠ Production API health endpoint is unavailable; verify the backend deployment and Vercel VITE_API_URL')
}

console.log('\n── Still manual (one-time) ──')
console.log('  1. Railway/Render: see docs/DEPLOY_RAILWAY_RENDER.md')
console.log('  2. Vercel:  npm run vercel:env:push:live && npm run vercel:deploy')
console.log('  3. GA4:     analytics.google.com → Admin → Data Streams → copy G- ID')
console.log('  4. Search Console: https://search.google.com/search-console')
console.log('       → Sitemaps → submit: sitemap.xml  (full URL: https://www.livegovtjobs.com/sitemap.xml)')
console.log('  5. Razorpay Premium: docs/RAZORPAY.md')
console.log('\nFull guide: docs/GO_LIVE.md')

const failed = checks.filter((c) => !c).length
process.exit(failed ? 1 : 0)
