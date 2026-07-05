#!/usr/bin/env node
/**
 * Resolve GitHub Actions DATABASE_URL from either:
 *   1) DATABASE_URL / SECRET_DATABASE_URL
 *   2) SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD (+ optional pooler host overrides)
 */
import { appendFileSync } from 'node:fs'

const directUrl = (process.env.SECRET_DATABASE_URL || process.env.DATABASE_URL || '').trim()
const ref = (process.env.SUPABASE_PROJECT_REF || '').trim()
const password = (process.env.SUPABASE_DB_PASSWORD || '').trim()
const region = (process.env.SUPABASE_DB_REGION || 'ap-south-1').trim()
const host = (process.env.SUPABASE_POOLER_HOST || `aws-0-${region}.pooler.supabase.com`).trim()
const port = (process.env.SUPABASE_POOLER_PORT || '6543').trim()

function fail(message, details = []) {
  console.error(message)
  for (const detail of details) {
    console.error(detail)
  }
  process.exit(1)
}

function validateDatabaseUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(rawUrl.replace(/^postgresql\+asyncpg:/, 'postgresql:'))
  } catch {
    fail('Invalid DATABASE_URL secret.', [
      'Expected a SQLAlchemy asyncpg URL like:',
      '  postgresql+asyncpg://postgres.<project-ref>:<password>@aws-N-REGION.pooler.supabase.com:6543/postgres',
    ])
  }

  if (!parsed.protocol.startsWith('postgresql')) {
    fail('Invalid DATABASE_URL secret.', ['Expected a postgresql:// or postgresql+asyncpg:// URL.'])
  }

  if (!parsed.hostname) {
    fail('Invalid DATABASE_URL secret.', ['Missing host in database URL.'])
  }

  if (/^db\.[^.]+\.supabase\.co$/.test(parsed.hostname) && parsed.port === '6543') {
    fail('Invalid DATABASE_URL secret.', [
      'Do not use db.PROJECT.supabase.co:6543 on GitHub Actions.',
      'Use the Transaction pooler host aws-N-REGION.pooler.supabase.com:6543 instead.',
    ])
  }
}

function writeDatabaseUrl(url, source) {
  validateDatabaseUrl(url)
  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `DATABASE_URL=${url}\n`)
  }
  console.log(`Resolved DATABASE_URL from ${source}`)
}

if (directUrl) {
  writeDatabaseUrl(directUrl, 'DATABASE_URL secret')
  process.exit(0)
}

if (!ref || !password) {
  fail(
    'No database credentials configured for GitHub Actions.',
    [
      'Add either:',
      '  DATABASE_URL',
      'or both:',
      '  SUPABASE_PROJECT_REF',
      '  SUPABASE_DB_PASSWORD',
      'Optional pooler overrides:',
      '  SUPABASE_POOLER_HOST = aws-N-REGION.pooler.supabase.com',
      '  SUPABASE_POOLER_PORT = 6543',
      '  SUPABASE_DB_REGION = REGION (fallback only when SUPABASE_POOLER_HOST is absent)',
    ]
  )
}

if (!/^aws-\d+-.+\.pooler\.supabase\.com$/.test(host)) {
  fail(`Invalid SUPABASE_POOLER_HOST: ${host}`, ['Expected: aws-N-REGION.pooler.supabase.com'])
}

const user = `postgres.${ref}`
const url = `postgresql+asyncpg://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres`
writeDatabaseUrl(url, 'SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD')
console.log(`Built pooler URL: postgresql+asyncpg://${user}:****@${host}:${port}/postgres`)
