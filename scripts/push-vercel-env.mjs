#!/usr/bin/env node
/**
 * Push frontend env from frontend/.env.local to Vercel (production + preview).
 * Prereq: vercel login && vercel link
 *
 *   npm run vercel:env:push
 */
import { readFileSync, existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, 'frontend', '.env.local')

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

const local = loadEnv(envPath)
const url = local.VITE_SUPABASE_URL
const anon = local.VITE_SUPABASE_ANON_KEY

if (!url || !anon || url.includes('your-project')) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in frontend/.env.local')
  process.exit(1)
}

// Production must read live DB — never push local dev value (often `api` or `auto`).
const jobsSource = process.env.VERCEL_JOBS_SOURCE || 'supabase'
const localJobsSource = local.VITE_JOBS_SOURCE
if (localJobsSource && localJobsSource !== 'supabase') {
  console.log(`  (local VITE_JOBS_SOURCE=${localJobsSource} — not pushed; Vercel gets supabase)`)
}
const apiUrl =
  process.env.VERCEL_API_URL ??
  (local.VITE_API_URL?.trim() ||
    (process.env.GO_LIVE === '1' ? 'https://api.livegovtjobs.com' : ''))
const dailySyncOnly = local.VITE_DAILY_SYNC_ONLY ?? (process.env.GO_LIVE === '1' ? '0' : '')
const gaId = process.env.VERCEL_GA_MEASUREMENT_ID ?? local.VITE_GA_MEASUREMENT_ID ?? ''
const siteUrl = process.env.VERCEL_SITE_URL ?? local.VITE_SITE_URL ?? (process.env.GO_LIVE === '1' ? 'https://www.livegovtjobs.com' : '')
const googleVerify =
  process.env.VERCEL_GOOGLE_SITE_VERIFICATION ?? local.VITE_GOOGLE_SITE_VERIFICATION ?? ''

const pairs = [
  ['VITE_SUPABASE_URL', url],
  ['VITE_SUPABASE_ANON_KEY', anon],
  ['VITE_JOBS_SOURCE', jobsSource],
  // Omit empty API URL — Vercel CLI rejects --value ""
  ...(apiUrl ? [['VITE_API_URL', apiUrl]] : []),
  ...(dailySyncOnly !== '' ? [['VITE_DAILY_SYNC_ONLY', dailySyncOnly]] : []),
  ...(gaId ? [['VITE_GA_MEASUREMENT_ID', gaId]] : []),
  ...(googleVerify ? [['VITE_GOOGLE_SITE_VERIFICATION', googleVerify]] : []),
  ...(siteUrl ? [['VITE_SITE_URL', siteUrl]] : []),
]

function addOne(key, value, target) {
  const vercel = process.platform === 'win32' ? 'vercel.cmd' : 'vercel'
  const args = ['env', 'add', key, target, '--value', value, '--yes', '--force', '--no-sensitive', '--non-interactive']
  const r = spawnSync(vercel, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true })
  if (r.stdout) process.stdout.write(r.stdout)
  if (r.stderr) process.stderr.write(r.stderr)
  if (r.status !== 0) {
    console.error(`Failed: vercel env add ${key} ${target} (exit ${r.status})`)
    if (r.stderr) console.error(String(r.stderr))
    process.exit(r.status || 1)
  }
  console.log(`  ✓ ${key} (${target})`)
}

const targets = (process.env.VERCEL_ENV_TARGETS || 'production,preview')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean)

console.log(`Pushing env to linked Vercel project (${targets.join(' + ')})…`)
console.log('  VITE_JOBS_SOURCE =', jobsSource)
if (apiUrl) console.log('  VITE_API_URL =', apiUrl)
else if (process.env.GO_LIVE === '1') {
  console.warn('  ⚠ VITE_API_URL not set — admin dashboard needs https://api.livegovtjobs.com after Railway deploy')
}
if (gaId) console.log('  VITE_GA_MEASUREMENT_ID =', gaId)
if (googleVerify) console.log('  VITE_GOOGLE_SITE_VERIFICATION = (set)')
if (process.env.GO_LIVE === '1') console.log('  (GO_LIVE=1 — production API URL + site URL defaults applied)')
for (const target of targets) {
  for (const [key, value] of pairs) {
    addOne(key, value, target)
  }
}
console.log('Done. Redeploy production: vercel --prod | preview: vercel')
