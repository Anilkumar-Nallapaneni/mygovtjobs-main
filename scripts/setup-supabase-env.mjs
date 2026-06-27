#!/usr/bin/env node
/**
 * Create/update local Supabase env files without committing secrets.
 *
 * Examples:
 *   DATABASE_URL=... VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run setup:supabase-env
 *   npm run setup:supabase-env -- --database-url ... --supabase-url ... --anon-key ...
 */
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const FRONTEND_ORDER = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_API_URL',
  'VITE_JOBS_SOURCE',
  'VITE_DAILY_SYNC_ONLY',
  'VITE_GA_MEASUREMENT_ID',
  'VITE_GOOGLE_SITE_VERIFICATION',
]

const BACKEND_ORDER = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_API_KEY',
  'CORS_ORIGINS',
  'SQL_ECHO',
  'APP_ENV',
  'DAILY_SYNC_ENFORCE_ONCE',
  'ALLOW_FALLBACK_JSON_EXPORT',
]

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const eq = arg.indexOf('=')
    const key = arg.slice(2, eq === -1 ? undefined : eq)
    const value = eq === -1 ? argv[i + 1] : arg.slice(eq + 1)
    if (eq === -1) i += 1
    out[key] = value
  }
  return out
}

function loadEnv(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index < 1) continue
    out[trimmed.slice(0, index)] = trimmed.slice(index + 1)
  }
  return out
}

function normalizeDatabaseUrl(value) {
  if (!value) return ''
  const trimmed = value.trim()
  if (trimmed.startsWith('postgresql://')) {
    return trimmed.replace(/^postgresql:\/\//, 'postgresql+asyncpg://')
  }
  return trimmed
}

function validateDatabaseUrl(value) {
  if (!value) return 'DATABASE_URL is required'
  if (!value.startsWith('postgresql+asyncpg://')) {
    return 'DATABASE_URL must start with postgresql+asyncpg://'
  }
  if (value.includes('@db.') && value.includes(':6543/')) {
    return 'DATABASE_URL port 6543 must use aws-N-REGION.pooler.supabase.com, not db.PROJECT.supabase.co'
  }
  return ''
}

function validateSupabaseUrl(value) {
  if (!/^https:\/\/[^.]+\.supabase\.co\/?$/.test(value || '')) {
    return 'VITE_SUPABASE_URL must look like https://YOUR_PROJECT_REF.supabase.co'
  }
  return ''
}

function projectRefFromUrl(value) {
  const match = String(value || '').match(/^https:\/\/([^.]+)\.supabase\.co\/?$/)
  return match ? match[1] : ''
}

function projectRefFromDatabaseUrl(value) {
  try {
    const parsed = new URL(value.replace(/^postgresql\+asyncpg:/, 'postgresql:'))
    const username = decodeURIComponent(parsed.username || '')
    if (username.startsWith('postgres.')) return username.slice('postgres.'.length)
    if (parsed.hostname.startsWith('db.') && parsed.hostname.endsWith('.supabase.co')) {
      return parsed.hostname.slice(3, -'.supabase.co'.length)
    }
  } catch {
    return ''
  }
  return ''
}

function writeEnv(path, values, order) {
  mkdirSync(dirname(path), { recursive: true })
  const existing = loadEnv(path)
  const merged = { ...existing, ...values }
  const keys = [...order, ...Object.keys(merged).filter((key) => !order.includes(key)).sort()]
  const lines = []
  for (const key of keys) {
    if (merged[key] === undefined) continue
    lines.push(`${key}=${merged[key]}`)
  }
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8')
}

const args = parseArgs(process.argv.slice(2))
const frontendPath = join(root, 'frontend', '.env.local')
const backendPath = join(root, 'backend', '.env')
const existingFrontend = loadEnv(frontendPath)
const existingBackend = loadEnv(backendPath)

const databaseUrl = normalizeDatabaseUrl(args['database-url'] || process.env.DATABASE_URL || existingBackend.DATABASE_URL)
const supabaseUrl = (args['supabase-url'] || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || existingFrontend.VITE_SUPABASE_URL || existingBackend.SUPABASE_URL || '').trim().replace(/\/$/, '')
const anonKey = (args['anon-key'] || process.env.VITE_SUPABASE_ANON_KEY || existingFrontend.VITE_SUPABASE_ANON_KEY || '').trim()
const serviceRoleKey = (args['service-role-key'] || process.env.SUPABASE_SERVICE_ROLE_KEY || existingBackend.SUPABASE_SERVICE_ROLE_KEY || 'PASTE_SERVICE_ROLE_KEY_HERE').trim()
const adminKey = (args['admin-key'] || process.env.ADMIN_API_KEY || existingBackend.ADMIN_API_KEY || randomBytes(32).toString('hex')).trim()

const errors = [
  validateDatabaseUrl(databaseUrl),
  validateSupabaseUrl(supabaseUrl),
  anonKey ? '' : 'VITE_SUPABASE_ANON_KEY is required',
].filter(Boolean)

const urlRef = projectRefFromUrl(supabaseUrl)
const dbRef = projectRefFromDatabaseUrl(databaseUrl)
if (urlRef && dbRef && urlRef !== dbRef) {
  errors.push(`Supabase project ref mismatch: URL uses ${urlRef}, DATABASE_URL uses ${dbRef}`)
}

if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`)
  console.error('\nPass values with environment variables or flags. See frontend/.env.example and backend/.env.example.')
  process.exit(1)
}

writeEnv(
  frontendPath,
  {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
    VITE_API_URL: existingFrontend.VITE_API_URL ?? '',
    VITE_JOBS_SOURCE: existingFrontend.VITE_JOBS_SOURCE || 'auto',
    VITE_DAILY_SYNC_ONLY: existingFrontend.VITE_DAILY_SYNC_ONLY || '0',
  },
  FRONTEND_ORDER
)

writeEnv(
  backendPath,
  {
    DATABASE_URL: databaseUrl,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    ADMIN_API_KEY: adminKey,
    CORS_ORIGINS:
      existingBackend.CORS_ORIGINS ||
      'http://localhost:2222,http://localhost:2223,http://127.0.0.1:2222,http://127.0.0.1:2223',
    SQL_ECHO: existingBackend.SQL_ECHO || '0',
    APP_ENV: existingBackend.APP_ENV || 'development',
    DAILY_SYNC_ENFORCE_ONCE: existingBackend.DAILY_SYNC_ENFORCE_ONCE || '1',
    ALLOW_FALLBACK_JSON_EXPORT: existingBackend.ALLOW_FALLBACK_JSON_EXPORT || '1',
  },
  BACKEND_ORDER
)

console.log('✓ Wrote frontend/.env.local')
console.log('✓ Wrote backend/.env')
if (serviceRoleKey === 'PASTE_SERVICE_ROLE_KEY_HERE') {
  console.log('○ Add SUPABASE_SERVICE_ROLE_KEY later for Supabase Storage uploads and privileged backend tasks.')
}
console.log('\nVerify:')
console.log('  npm run env:check')
console.log('  npm run supabase:test')
console.log('  npm run db:test')
