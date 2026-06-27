#!/usr/bin/env node
/**
 * Remove legacy aggregator-catalog jobs from static frontend data.
 * - Strips structured-import / freejobalert rows from live-jobs.json
 * - Deletes matching job-details/*.json files
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIVE_JSON = path.join(ROOT, 'frontend/public/data/live-jobs.json')
const DETAILS_DIR = path.join(ROOT, 'frontend/public/data/job-details')

function isCatalogRow(row) {
  const detail = row?.detail && typeof row.detail === 'object' ? row.detail : {}
  const source = String(detail.source || row?.source || '').toLowerCase()
  if (source === 'structured-import' || source === 'fja-import') return true
  if (String(detail.data_origin || '').toLowerCase() === 'freejobalert') return true
  return false
}

function isCatalogDetailFile(text) {
  return (
    /"data_origin"\s*:\s*"freejobalert"/i.test(text) ||
    /"source"\s*:\s*"structured-import"/i.test(text) ||
    /"source"\s*:\s*"fja-import"/i.test(text)
  )
}

function purgeLiveJobs() {
  if (!fs.existsSync(LIVE_JSON)) {
    console.log('live-jobs.json not found — skip')
    return { removed: 0, kept: 0 }
  }
  const payload = JSON.parse(fs.readFileSync(LIVE_JSON, 'utf8'))
  const items = Array.isArray(payload.items) ? payload.items : []
  const kept = items.filter((row) => !isCatalogRow(row))
  const removed = items.length - kept.length
  if (removed > 0) {
    payload.items = kept
    payload.generatedAt = new Date().toISOString()
    fs.writeFileSync(LIVE_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  }
  return { removed, kept: kept.length }
}

function purgeJobDetails() {
  if (!fs.existsSync(DETAILS_DIR)) {
    console.log('job-details/ not found — skip')
    return 0
  }
  let removed = 0
  for (const name of fs.readdirSync(DETAILS_DIR)) {
    if (!name.endsWith('.json')) continue
    const file = path.join(DETAILS_DIR, name)
    const text = fs.readFileSync(file, 'utf8')
    if (isCatalogDetailFile(text)) {
      fs.unlinkSync(file)
      removed += 1
    }
  }
  return removed
}

const live = purgeLiveJobs()
const details = purgeJobDetails()
console.log(`Purge complete: live-jobs removed=${live.removed} kept=${live.kept}, job-details deleted=${details}`)
