#!/usr/bin/env node
/**
 * Guard against shipping broken job snapshots (stale list vs full, zero vacancies).
 * Used by deploy:verify and frontend build.
 */
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fullPath = join(root, 'frontend/public/data/live-jobs.json')
const listPath = join(root, 'frontend/public/data/live-jobs-list.json')

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function vacancySum(items) {
  let sum = 0
  let withVac = 0
  for (const row of items) {
    const v = Number(row?.vacancies) || 0
    if (v > 0) {
      sum += v
      withVac += 1
    }
  }
  return { sum, withVac, total: items.length }
}

function indiaDateIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${value.year}-${value.month}-${value.day}`
}

const HTML_TAG_RE = /<\/?[a-z][^>]*>/i

export function verifyLiveJobsSnapshot({ strict = false } = {}) {
  const issues = []
  const warnings = []

  if (!existsSync(fullPath)) {
    issues.push('missing frontend/public/data/live-jobs.json')
    return { ok: false, issues, warnings }
  }

  const full = readJson(fullPath)
  const fullItems = Array.isArray(full?.items) ? full.items : []
  if (!fullItems.length) {
    issues.push('live-jobs.json has no items')
    return { ok: false, issues, warnings }
  }

  const fullVac = vacancySum(fullItems)
  const vacRate = fullVac.withVac / fullVac.total
  const todayIndia = indiaDateIso()
  const htmlTitles = fullItems.filter((row) => HTML_TAG_RE.test(String(row?.title || '')))
  const expiredAsLive = fullItems.filter(
    (row) => String(row?.status || 'live').toLowerCase() === 'live'
      && String(row?.last_date || '')
      && String(row.last_date).slice(0, 10) < todayIndia
  )
  const liveWithoutDeadline = fullItems.filter(
    (row) => String(row?.status || 'live').toLowerCase() === 'live'
      && !String(row?.last_date || '').trim()
  )

  if (htmlTitles.length) {
    issues.push(`${htmlTitles.length} title(s) contain raw HTML`)
  }
  if (expiredAsLive.length) {
    issues.push(`${expiredAsLive.length} past-deadline job(s) are still marked live as of ${todayIndia} IST`)
  }
  if (liveWithoutDeadline.length) {
    issues.push(`${liveWithoutDeadline.length} live job(s) have no normalized deadline`)
  }

  if (fullVac.withVac === 0) {
    issues.push(
      `live-jobs.json has 0 jobs with vacancies (${fullVac.total} rows) — run DB export after enrich/sync`
    )
  } else if (vacRate < 0.08) {
    const msg = `only ${(vacRate * 100).toFixed(1)}% of jobs have vacancy counts (${fullVac.withVac}/${fullVac.total})`
    if (strict) issues.push(msg)
    else warnings.push(msg)
  }

  if (!existsSync(listPath)) {
    warnings.push('missing live-jobs-list.json — run npm run build:live-jobs-list')
    return { ok: issues.length === 0, issues, warnings, fullVac }
  }

  const list = readJson(listPath)
  const listItems = Array.isArray(list?.items) ? list.items : []

  if (listItems.length !== fullItems.length) {
    issues.push(
      `live-jobs-list.json out of sync (${listItems.length} rows vs ${fullItems.length} in live-jobs.json) — run npm run build:live-jobs-list`
    )
  }

  const fullAt = String(full?.generatedAt || '')
  const listAt = String(list?.generatedAt || '')
  if (fullAt && listAt && fullAt !== listAt) {
    issues.push(
      `snapshot timestamps differ (list=${listAt} full=${fullAt}) — run npm run build:live-jobs-list`
    )
  }

  const listVac = vacancySum(listItems)
  if (listItems.length && listVac.withVac === 0 && fullVac.withVac > 0) {
    issues.push('live-jobs-list.json lost vacancy fields — rebuild list from full export')
  }

  if (listItems.length && fullItems.length) {
    const fullBySlug = new Map(fullItems.map((row) => [String(row?.slug || ''), row]))
    let mismatch = 0
    const samples = []
    for (const listRow of listItems) {
      const slug = String(listRow?.slug || '')
      const fullRow = fullBySlug.get(slug)
      if (!fullRow) continue
      const lv = Number(listRow?.vacancies) || 0
      const fv = Number(fullRow?.vacancies) || 0
      if (lv !== fv) {
        mismatch += 1
        if (samples.length < 3) {
          samples.push(`${slug.slice(0, 48)}… list=${lv} full=${fv}`)
        }
      }
    }
    if (mismatch > 0) {
      issues.push(
        `${mismatch} vacancy mismatch(es) between list and full JSON — run npm run build:live-jobs-list (e.g. ${samples.join('; ')})`
      )
    }
  }

  return { ok: issues.length === 0, issues, warnings, fullVac, listVac }
}

function main() {
  const strict = process.argv.includes('--strict')
  const result = verifyLiveJobsSnapshot({ strict })

  for (const w of result.warnings) {
    console.warn(`⚠ live-jobs snapshot: ${w}`)
  }
  for (const issue of result.issues) {
    console.error(`✗ live-jobs snapshot: ${issue}`)
  }

  if (result.ok) {
    const v = result.fullVac
    console.log(
      `✓ live-jobs snapshot OK — ${v.total} rows, ${v.withVac} with vacancies, sum≈${v.sum.toLocaleString('en-IN')}`
    )
    process.exit(0)
  }

  console.error('\nFix: npm run clean:live-jobs  OR  re-export from DB, then npm run build:live-jobs-list')
  process.exit(1)
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('verify-live-jobs-snapshot.mjs')) {
  main()
}
