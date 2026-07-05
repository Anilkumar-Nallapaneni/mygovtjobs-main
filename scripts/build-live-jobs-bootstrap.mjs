#!/usr/bin/env node
/**
 * Build frontend/public/data/live-jobs-bootstrap.json — first N rows from live-jobs-list.json.
 * Keeps first paint small on mobile (~80–120 KB gzip). Keep N in sync with INITIAL_LIVE_ROWS.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const listPath = join(root, 'frontend/public/data/live-jobs-list.json')
const bootstrapPath = join(root, 'frontend/public/data/live-jobs-bootstrap.json')
const BOOTSTRAP_ROWS = Number(process.env.LIVE_JOBS_BOOTSTRAP_ROWS || 400)

/** Minimal fields for home/browse first paint — no detail blob. */
const BOOTSTRAP_JOB_KEYS = new Set([
  'id',
  'slug',
  'title',
  'dept',
  'category',
  'state_codes',
  'vacancies',
  'qualification',
  'last_date',
  'apply_url',
  'status',
  'published_at',
  'post_name',
])

function ultraSlimRow(row) {
  const out = {}
  for (const key of BOOTSTRAP_JOB_KEYS) {
    if (row[key] != null) out[key] = row[key]
  }
  return out
}

function main() {
  if (!existsSync(listPath)) {
    console.error(`Missing ${listPath} — run build-live-jobs-list.mjs first`)
    process.exit(1)
  }

  const payload = JSON.parse(readFileSync(listPath, 'utf8'))
  const items = Array.isArray(payload.items) ? payload.items : []
  const bootstrapPayload = {
    generatedAt: payload.generatedAt ?? null,
    dailySync: payload.dailySync ?? null,
    bootstrap: true,
    items: items.slice(0, BOOTSTRAP_ROWS).map(ultraSlimRow),
  }

  writeFileSync(bootstrapPath, JSON.stringify(bootstrapPayload), 'utf8')

  const listKb = Math.round(readFileSync(listPath, 'utf8').length / 1024)
  const bootKb = Math.round(readFileSync(bootstrapPath, 'utf8').length / 1024)
  console.log(
    `Wrote ${bootstrapPath} — ${bootstrapPayload.items.length} rows (${bootKb} KB vs ${listKb} KB list)`
  )
}

main()
