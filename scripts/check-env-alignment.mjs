#!/usr/bin/env node
/**
 * Verify frontend and backend env files reference the same Supabase project.
 * Run: npm run env:check
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  projectRefFromDatabaseUrl,
  projectRefFromSupabaseUrl,
  validateSupabaseAnonKey,
} from './lib/supabase-env-utils.mjs'

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

const fePath = join(root, 'frontend/.env.local')
const bePath = join(root, 'backend/.env')
if (process.env.CI === 'true' && !existsSync(fePath) && !existsSync(bePath)) {
  console.log('CI: no local .env files — skipping env alignment check')
  process.exit(0)
}

const fe = loadEnv(fePath)
const be = loadEnv(bePath)

const feRef = projectRefFromSupabaseUrl(fe.VITE_SUPABASE_URL)
const beUrlRef = projectRefFromSupabaseUrl(be.SUPABASE_URL)
const beDbRef = projectRefFromDatabaseUrl(be.DATABASE_URL)

let ok = true

function check(name, pass, detail = '') {
  const icon = pass ? '✓' : '✗'
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!pass) ok = false
}

check('frontend/.env.local exists', existsSync(join(root, 'frontend/.env.local')))
check('backend/.env exists', existsSync(join(root, 'backend/.env')))
check('VITE_SUPABASE_URL set', Boolean(feRef), feRef || 'copy frontend/.env.local.example → frontend/.env.local')
check('SUPABASE_URL set', Boolean(beUrlRef), beUrlRef || 'copy backend/.env.example → backend/.env')
check('DATABASE_URL set', Boolean(beDbRef), beDbRef || 'set pooler URI in backend/.env')

if (feRef && beUrlRef) {
  check('Supabase project ref matches (URL)', feRef === beUrlRef, `${feRef} vs ${beUrlRef}`)
}
if (feRef && beDbRef) {
  check('Supabase project ref matches (DB)', feRef === beDbRef, `${feRef} vs ${beDbRef}`)
}

if (fe.VITE_SUPABASE_ANON_KEY?.includes('service_role')) {
  check('anon key is not service_role', false, 'use anon/public key in frontend only')
}
const anonKeyError = validateSupabaseAnonKey(fe.VITE_SUPABASE_ANON_KEY, feRef)
check('VITE_SUPABASE_ANON_KEY is valid for frontend', !anonKeyError, anonKeyError)

console.log(ok ? '\nEnv alignment OK' : '\nFix mismatched env files before ingest/deploy')
process.exit(ok ? 0 : 1)
