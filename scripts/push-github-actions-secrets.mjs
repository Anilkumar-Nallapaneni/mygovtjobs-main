#!/usr/bin/env node
/**
 * Push GitHub Actions secrets from local env files.
 * Prereq: gh auth login
 *
 *   npm run github:secrets:push
 */
import { readFileSync, existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const gh = process.platform === 'win32' ? 'C:\\Program Files\\GitHub CLI\\gh.exe' : 'gh'
const repo = process.env.GITHUB_REPO || 'Anilkumar-Nallapaneni/mygovtjobs-main'

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

function ghOk() {
  const r = spawnSync(gh, ['auth', 'status'], { encoding: 'utf8', shell: false })
  return r.status === 0
}

function setSecret(name, value) {
  const r = spawnSync(gh, ['secret', 'set', name, '--repo', repo, '--body', value], {
    encoding: 'utf8',
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  if (r.status !== 0) {
    console.error(`✗ Failed to set ${name}`)
    if (r.stderr) console.error(String(r.stderr).trim())
    return false
  }
  console.log(`✓ ${name}`)
  return true
}

function parseDatabaseUrl(value) {
  if (!value) return {}
  try {
    const parsed = new URL(value.replace(/^postgresql\+asyncpg:/, 'postgresql:'))
    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
    }
  } catch {
    return {}
  }
}

function poolerRegion(host) {
  const match = String(host || '').match(/^aws-\d+-(.+)\.pooler\.supabase\.com$/)
  return match ? match[1] : ''
}

const fe = loadEnv(join(root, 'frontend/.env.local'))
const be = loadEnv(join(root, 'backend/.env'))

const databaseUrl = (be.DATABASE_URL || process.env.DATABASE_URL || '').trim()
const supabaseUrl = (fe.VITE_SUPABASE_URL || be.SUPABASE_URL || '').trim()
const anonKey = (fe.VITE_SUPABASE_ANON_KEY || '').trim()
const serviceRole = (be.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

if (!ghOk()) {
  console.error('✗ GitHub CLI not logged in.')
  console.error('  Run: & "C:\\Program Files\\GitHub CLI\\gh.exe" auth login')
  process.exit(1)
}

let ok = true
const required = [
  ['DATABASE_URL', databaseUrl],
  ['VITE_SUPABASE_URL', supabaseUrl],
  ['VITE_SUPABASE_ANON_KEY', anonKey],
  ['SUPABASE_SERVICE_ROLE_KEY', serviceRole],
]

for (const [name, value] of required) {
  if (!value || value.includes('PASTE_') || value.includes('your-project')) {
    if (name === 'SUPABASE_SERVICE_ROLE_KEY') {
      console.log(`○ Skip ${name} — not in backend/.env (keep existing GitHub secret)`)
      continue
    }
    console.error(`✗ Missing ${name}`)
    ok = false
    continue
  }
  if (!setSecret(name, value)) ok = false
}

// Pooler builder fallback for Actions (IPv4) when direct DATABASE_URL uses aws-1 host.
const refMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
if (refMatch) {
  setSecret('SUPABASE_PROJECT_REF', refMatch[1])
}
const { host: poolerHost, port: poolerPort } = parseDatabaseUrl(databaseUrl)
if (/^aws-\d+-.+\.pooler\.supabase\.com$/.test(poolerHost || '')) {
  setSecret('SUPABASE_POOLER_HOST', poolerHost)
  setSecret('SUPABASE_POOLER_PORT', poolerPort || '6543')
  const region = poolerRegion(poolerHost)
  if (region) {
    setSecret('SUPABASE_DB_REGION', region)
  }
}

if (!ok) {
  console.error('\nFix missing values, then re-run: npm run github:secrets:push')
  process.exit(1)
}

console.log('\nDone. Test: GitHub → Actions → Supabase auto ingest → Run workflow')
