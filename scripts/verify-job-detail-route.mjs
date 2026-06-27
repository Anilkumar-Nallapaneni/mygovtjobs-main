#!/usr/bin/env node
/** Verify job detail route data: slim snapshot, Supabase full detail, SEO helpers. */
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
const TEST_SLUG = 'iit-madras-assistant-professor-recruitment-2026-apply-online-for-40-posts-527824e5'

const headers = { apikey: anon, Authorization: `Bearer ${anon}` }

function ok(label, pass, detail = '') {
  console.log(`${pass ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  return pass
}

// 1. Slim snapshot check
const snapPath = join(root, 'frontend/public/data/live-jobs.json')
const snap = JSON.parse(readFileSync(snapPath, 'utf8'))
const sample = snap.items?.find((j) => j.slug === TEST_SLUG) || snap.items?.[0]
const slimDetail = sample?.detail || {}
const hasSectionsInSnap = Boolean(slimDetail.content_sections?.length)
ok(
  'live-jobs.json list row has no content_sections (slim export)',
  !hasSectionsInSnap,
  hasSectionsInSnap ? `${slimDetail.content_sections.length} sections still present` : 'slim OK'
)

// 2. Supabase full detail
let supabaseJob = null
try {
  const res = await fetch(
    `${url}/rest/v1/jobs?slug=eq.${encodeURIComponent(TEST_SLUG)}&select=slug,title,detail&limit=1`,
    { headers }
  )
  const rows = await res.json()
  supabaseJob = rows?.[0]
  const sections = supabaseJob?.detail?.content_sections
  ok(
    'Supabase returns full job detail with content_sections',
    Array.isArray(sections) && sections.length > 0,
    sections ? `${sections.length} sections` : 'missing'
  )
} catch (e) {
  ok('Supabase returns full job detail', false, String(e.message || e))
}

// 3. API job by slug (optional)
try {
  const res = await fetch(`http://127.0.0.1:8000/api/jobs/${encodeURIComponent(TEST_SLUG)}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (res.ok) {
    const job = await res.json()
    const n = job?.detail?.content_sections?.length || 0
    ok('API /api/jobs/:slug returns full detail', n > 0, `${n} sections`)
  } else {
    ok('API /api/jobs/:slug (optional — start npm run api:dev)', true, `skipped HTTP ${res.status}`)
  }
} catch {
  ok('API /api/jobs/:slug (optional — start npm run api:dev)', true, 'skipped (API not running)')
}

// 4. Dev server SPA route
try {
  const res = await fetch(`http://127.0.0.1:2222/jobs/${TEST_SLUG}`, { signal: AbortSignal.timeout(5000) })
  const html = await res.text()
  ok('Dev server serves job route (SPA shell)', res.ok && html.includes('id="root"'), `HTTP ${res.status}`)
  ok(
    'Initial HTML has default title (SEO injected client-side after load)',
    html.includes('<title>') && html.includes('My Govt Jobs'),
    'title tag in index.html'
  )
  ok(
    'JSON-LD not in View Source (expected for SPA — added by React on job page)',
    !html.includes('JobPosting'),
    'use DevTools Elements tab after page loads'
  )
} catch {
  ok('Dev server on :2222', false, 'not running — run npm run dev')
}

console.log('\nJob URL to open manually:')
console.log(`  http://localhost:2222/jobs/${TEST_SLUG}`)
console.log('\nAfter page loads, check in DevTools:')
console.log('  - document.title → job title + "| My Govt Jobs"')
console.log('  - Elements → script#job-posting-jsonld (JobPosting schema)')
