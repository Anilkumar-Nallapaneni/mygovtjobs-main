#!/usr/bin/env node
/**
 * Warn when DATABASE_URL will fail on GitHub Actions (IPv6-only db host, wrong port).
 * Loads backend/.env when DATABASE_URL is not set in the shell.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lookup } from 'node:dns/promises'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(path) {
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

const backendEnv = loadEnvFile(join(root, 'backend/.env'))
const url = (process.env.DATABASE_URL || backendEnv.DATABASE_URL || '').trim()

if (!url) {
  console.error('✗ DATABASE_URL is empty')
  console.error('  Set it in backend/.env (Supabase transaction pooler, port 6543)')
  console.error('  Example: postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres')
  process.exit(1)
}

let host = ''
let port = ''
try {
  const u = new URL(url.replace(/^postgresql\+asyncpg:/, 'postgresql:'))
  host = u.hostname
  port = u.port || '5432'
} catch {
  console.error('✗ DATABASE_URL is not a valid URL')
  process.exit(1)
}

let ok = true

if (/^db\.[^.]+\.supabase\.co$/.test(host) && port === '6543') {
  console.error('✗ Invalid host/port: db.*.supabase.co:6543')
  console.error('  Port 6543 is for pooler.supabase.com, not the db host.')
  ok = false
}

if (/^db\.[^.]+\.supabase\.co$/.test(host)) {
  try {
    const records = await lookup(host, { all: true })
    const hasV4 = records.some((r) => r.family === 4)
    const hasV6 = records.some((r) => r.family === 6)
    if (!hasV4 && hasV6) {
      console.error(`✗ ${host} resolves to IPv6 only — GitHub Actions cannot reach it (Errno 101)`)
      console.error('  Fix: copy Transaction pooler URI from Supabase → Database → Connection string')
      console.error('  Format: postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-N-REGION.pooler.supabase.com:6543/postgres')
      ok = false
    } else if (hasV4) {
      console.log(`✓ ${host} has IPv4 — OK for GitHub Actions on port ${port}`)
    }
  } catch (e) {
    console.error(`✗ DNS lookup failed for ${host}: ${e.message}`)
    ok = false
  }
} else if (/pooler\.supabase\.com$/.test(host) && port === '6543') {
  console.log(`✓ Pooler host ${host}:${port} — correct format for GitHub Actions`)
} else {
  console.log(`ℹ Host ${host}:${port}`)
}

if (!ok) process.exit(1)
console.log('\nDATABASE_URL diagnosis OK for GitHub Actions.')
