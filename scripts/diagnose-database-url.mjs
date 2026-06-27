#!/usr/bin/env node
/**
 * Warn when DATABASE_URL will fail on GitHub Actions (IPv6-only db host, wrong port).
 */
import { lookup } from 'node:dns/promises'

const url = (process.env.DATABASE_URL || '').trim()
if (!url) {
  console.error('✗ DATABASE_URL is empty')
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
