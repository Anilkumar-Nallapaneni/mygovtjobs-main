#!/usr/bin/env node
/**
 * Test Supabase REST + optional backend DB.
 * Run from repo root: node scripts/test-supabase-connection.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

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

const fe = loadEnv(join(root, 'frontend/.env.local'))
const url = fe.VITE_SUPABASE_URL
const anon = fe.VITE_SUPABASE_ANON_KEY

if (!url || !anon || url.includes('your-project')) {
  console.error('✗ Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in frontend/.env.local')
  process.exit(1)
}

console.log('Project:', url)

const headers = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
}

async function rest(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 200)
  }
  return { ok: res.ok, status: res.status, body }
}

function isInvalidApiKey(body) {
  return typeof body === 'object' && /invalid api key/i.test(String(body?.message || ''))
}

const health = await fetch(`${url}/rest/v1/`, { headers })
console.log(
  health.ok || health.status === 401
    ? '✓ REST API reachable'
    : `✗ REST ${health.status}`
)

const TABLES = [
  { name: 'sources', publicRead: true },
  { name: 'jobs', publicRead: true },
  { name: 'job_posts', publicRead: true },
  { name: 'job_dates', publicRead: true },
  { name: 'job_updates', publicRead: true },
  { name: 'raw_ingest', publicRead: false },
  { name: 'job_review_queue', publicRead: false },
  { name: 'alert_subscriptions', publicRead: false },
  { name: 'alert_deliveries', publicRead: false },
  { name: 'profiles', publicRead: false },
]
let ok = health.ok || health.status === 401

for (const table of TABLES) {
  const r = await rest(`${table.name}?select=id&limit=1`)
  if (r.status === 404 || (typeof r.body === 'object' && r.body?.code === 'PGRST205')) {
    console.log(`✗ Table \`${table.name}\` missing — run database/supabase_setup.sql`)
    ok = false
  } else if (r.status === 401 && isInvalidApiKey(r.body)) {
    console.log(`✗ ${table.name}: invalid Supabase API key — check VITE_SUPABASE_ANON_KEY`)
    ok = false
  } else if (!table.publicRead && (r.status === 401 || r.status === 403)) {
    console.log(`✓ ${table.name} private to anonymous users`)
  } else if (r.status === 401 || r.status === 403) {
    console.log(`✗ ${table.name}: ${r.status} (unexpected RLS/grants denial)`)
    ok = false
  } else if (!table.publicRead && r.ok) {
    console.log(`✗ ${table.name}: unexpectedly readable by anonymous users`)
    ok = false
  } else if (r.ok) {
    console.log(`✓ ${table.name}`)
  } else {
    console.log(`✗ ${table.name}: ${r.status}`)
    ok = false
  }
}

const jobs = await rest('jobs?select=id,title,status&status=eq.live&limit=3')
if (jobs.ok && Array.isArray(jobs.body) && jobs.body.length) {
  console.log('  sample:', jobs.body.map((r) => r.title).join(' | '))
}

console.log('\nRow counts: npm run supabase:audit')
console.log('Full ingest:  npm run supabase:full-sync')

process.exit(ok ? 0 : 1)
