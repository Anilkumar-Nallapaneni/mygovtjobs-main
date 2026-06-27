#!/usr/bin/env node
/**
 * Build Supabase pooler DATABASE_URL for GitHub Actions (IPv4).
 * Secrets: SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD, SUPABASE_DB_REGION (optional)
 */
import { appendFileSync } from 'node:fs'

const ref = (process.env.SUPABASE_PROJECT_REF || '').trim()
const password = (process.env.SUPABASE_DB_PASSWORD || '').trim()
const region = (process.env.SUPABASE_DB_REGION || 'ap-south-1').trim()
const host = (process.env.SUPABASE_POOLER_HOST || `aws-0-${region}.pooler.supabase.com`).trim()
const port = (process.env.SUPABASE_POOLER_PORT || '6543').trim()

if (!ref || !password) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_DB_PASSWORD')
  console.error('Add GitHub secrets:')
  console.error('  SUPABASE_PROJECT_REF = lqihbxujvvvzagrfoorf')
  console.error('  SUPABASE_DB_PASSWORD = your database password (plain text, not URL-encoded)')
  console.error('  SUPABASE_POOLER_HOST = aws-N-REGION.pooler.supabase.com (from Supabase connection string)')
  console.error('  SUPABASE_DB_REGION   = REGION (fallback only when SUPABASE_POOLER_HOST is absent)')
  process.exit(1)
}

if (!/^aws-\d+-.+\.pooler\.supabase\.com$/.test(host)) {
  console.error(`Invalid SUPABASE_POOLER_HOST: ${host}`)
  console.error('Expected: aws-N-REGION.pooler.supabase.com')
  process.exit(1)
}

const user = `postgres.${ref}`
const url = `postgresql+asyncpg://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres`

if (process.env.GITHUB_ENV) {
  appendFileSync(process.env.GITHUB_ENV, `DATABASE_URL=${url}\n`)
}
console.log(`Built pooler URL: postgresql+asyncpg://${user}:****@${host}:${port}/postgres`)
