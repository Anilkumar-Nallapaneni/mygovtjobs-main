#!/usr/bin/env node
/**
 * Build frontend/public/data/live-jobs-list.json from live-jobs.json.
 * Mirrors backend slim_job_for_list_json_export — run after sync or clean.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fullPath = join(root, 'frontend/public/data/live-jobs.json')
const listPath = join(root, 'frontend/public/data/live-jobs-list.json')

const LIST_JOB_KEYS = new Set([
  'id',
  'slug',
  'title',
  'dept',
  'category',
  'state_codes',
  'vacancies',
  'qualification',
  'salary',
  'age_limit',
  'last_date',
  'apply_url',
  'pdf_url',
  'status',
  'published_at',
  'updated_at',
  'post_name',
])

/** List/card detail only — no summary/published/pdfUrls (detail pages hydrate separately). */
const LIST_DETAIL_KEYS = new Set([
  'source',
  'pdf_urls',
  'apply_url',
  'official_url',
  'notification_url',
  'link',
  'source_url',
  'post_name',
  'posts',
])

function slimDetail(detail) {
  if (!detail || typeof detail !== 'object') return undefined
  const slim = {}
  for (const key of LIST_DETAIL_KEYS) {
    if (detail[key] != null) slim[key] = detail[key]
  }
  // Prefer snake_case; accept camelCase pdfUrls as fallback only.
  if (!slim.pdf_urls && Array.isArray(detail.pdfUrls)) {
    slim.pdf_urls = detail.pdfUrls
  }
  if (Array.isArray(slim.pdf_urls) && slim.pdf_urls.length > 2) {
    slim.pdf_urls = slim.pdf_urls.slice(0, 2)
  }
  if (Array.isArray(slim.posts) && slim.posts.length > 3) {
    slim.posts = slim.posts.slice(0, 3)
  }
  return Object.keys(slim).length ? slim : undefined
}

function slimRow(row) {
  const out = {}
  for (const key of LIST_JOB_KEYS) {
    if (row[key] != null) out[key] = row[key]
  }
  const detail = slimDetail(row.detail)
  if (detail) out.detail = detail
  return out
}

function main() {
  if (!existsSync(fullPath)) {
    console.error(`Missing ${fullPath}`)
    process.exit(1)
  }

  const payload = JSON.parse(readFileSync(fullPath, 'utf8'))
  const items = Array.isArray(payload.items) ? payload.items : []
  const listPayload = {
    generatedAt: payload.generatedAt ?? null,
    dailySync: payload.dailySync ?? null,
    items: items.map(slimRow),
  }

  writeFileSync(listPath, JSON.stringify(listPayload), 'utf8')

  const fullKb = Math.round(readFileSync(fullPath, 'utf8').length / 1024)
  const listKb = Math.round(readFileSync(listPath, 'utf8').length / 1024)
  console.log(`Wrote ${listPath} — ${listPayload.items.length} rows (${listKb} KB vs ${fullKb} KB full)`)
}

main()
