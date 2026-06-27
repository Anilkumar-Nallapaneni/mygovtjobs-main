import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function sanitizeVacancyCount(count, title = '', context = '') {
  const n = Number(count) || 0
  if (n <= 0) return 0
  if (n > 250_000) return 0
  const ctx = `${title || ''} ${context || ''}`
  if (n >= 1900 && n <= 2035 && ctx.includes(String(n))) {
    const s = String(n)
    const usedAsPosts =
      new RegExp(`${s}\\s*(?:posts?|vacanc|positions?|seats?)`, 'i').test(ctx) ||
      new RegExp(`(?:posts?|vacanc|positions?|seats?)\\s*(?:of\\s*)?${s}\\b`, 'i').test(ctx)
    if (!usedAsPosts) return 0
  }
  return n
}

function loadLiveItems() {
  const p = path.join(root, 'frontend/public/data/live-jobs.json')
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
  return raw.items || []
}

function sumVacancies(rows, pickVacancy) {
  let sum = 0
  let withVac = 0
  for (const r of rows) {
    const v = pickVacancy(r)
    sum += v
    if (v > 0) withVac++
  }
  return { sum, withVac, total: rows.length }
}

const items = loadLiveItems()
const raw = sumVacancies(items, (r) => Number(r.vacancies) || 0)
const sanitized = sumVacancies(items, (r) =>
  sanitizeVacancyCount(Number(r.vacancies) || 0, r.title || '', r.detail?.summary || '')
)

const yearBugs = items.filter((r) => {
  const v = Number(r.vacancies) || 0
  if (v < 1900 || v > 2035) return false
  const s = sanitizeVacancyCount(v, r.title || '', r.detail?.summary || '')
  return s !== v
})

console.log('=== live-jobs.json ===')
console.log('listings:', raw.total)
console.log('raw vacancy sum:', raw.sum, '| jobs with vac>0:', raw.withVac)
console.log('sanitized sum:', sanitized.sum, '| jobs with vac>0:', sanitized.withVac)
console.log('year mistaken as vacancy (fixed by sanitize):', yearBugs.length)
for (const r of yearBugs.slice(0, 6)) {
  console.log(' -', r.vacancies, (r.title || '').slice(0, 72))
}

function isProbableYear(n, context = '') {
  const num = Number(n) || 0
  if (num < 1900 || num > 2035) return false
  const ctx = String(context || '')
  if (!ctx.includes(String(num))) return true
  const s = String(num)
  const usedAsPosts =
    new RegExp(`${s}\\s*(?:posts?|vacanc|positions?|seats?)`, 'i').test(ctx) ||
    new RegExp(`(?:posts?|vacanc|positions?|seats?)\\s*(?:of\\s*)?${s}\\b`, 'i').test(ctx)
  return !usedAsPosts
}

function resolveVacancyCount(stored, title = '', summary = '', about = '') {
  const context = [title, summary, about].filter(Boolean).join(' ')
  const fromText = extractVacanciesFromText(title, summary, about)
  const raw = Number(stored) || 0
  let storedN = sanitizeVacancyCount(raw, title, summary)
  if (isProbableYear(raw, context)) storedN = 0
  if (fromText > 0) {
    if (!storedN || fromText <= storedN) return sanitizeVacancyCount(fromText, title, summary)
    const titleOnly = extractVacanciesFromText(title)
    if (titleOnly > 0) return sanitizeVacancyCount(titleOnly, title, summary)
    return sanitizeVacancyCount(fromText, title, summary)
  }
  return storedN
}

function enrichVacancies(row) {
  const title = row.title || ''
  const summary = row.detail?.summary || ''
  return resolveVacancyCount(Number(row.vacancies) || 0, title, summary)
}

// minimal extract (same patterns as frontend)
const VACANCY_PATTERNS = [
  /[–—-]\s*([\d,]+)\s*(?:posts?|vacanc(?:ies|y)|bharti|positions?|seats?)\b/i,
  /\b([\d,]+)\s+(?:posts?|vacanc(?:ies|y)|positions?|seats?)\b/i,
  /\b([\d,]+)\s+posts?\s+of\b/i,
]
const TOTAL_VACANCY_RE = /total\s*(?:no\.?\s*of\s*)?(?:posts?|vacanc(?:ies|y))\s*[:-]?\s*([\d,]+)/i
const ROLL_LIST_RE = /\bSl\s*No\.?\s*Roll\s*No\b/i

function parseIntVacancy(raw) {
  const n = parseInt(String(raw || '').replace(/,/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function isPlausibleVacancy(n, context) {
  if (n < 1 || n > 250_000) return false
  return sanitizeVacancyCount(n, context) > 0
}

function extractVacanciesFromText(...chunks) {
  const parts = chunks.filter(Boolean).map(String)
  const blob = parts.join(' ').trim()
  if (!blob) return 0
  const titleCtx = parts[0] || blob
  let scan = blob
  if (ROLL_LIST_RE.test(blob) && !/\b\d{1,6}\s*(?:posts?|vacanc)/i.test(blob)) scan = titleCtx
  const found = []
  let m
  const totalRe = new RegExp(TOTAL_VACANCY_RE.source, TOTAL_VACANCY_RE.flags + 'g')
  while ((m = totalRe.exec(scan)) !== null) {
    const n = parseIntVacancy(m[1])
    if (isPlausibleVacancy(n, titleCtx)) found.push(n)
  }
  if (found.length) return Math.max(...found)
  for (const re of VACANCY_PATTERNS) {
    const g = new RegExp(re.source, re.flags + 'g')
    while ((m = g.exec(scan)) !== null) {
      const n = parseIntVacancy(m[1])
      if (isPlausibleVacancy(n, titleCtx)) found.push(n)
    }
  }
  return found.length ? Math.max(...found) : 0
}

const ui = sumVacancies(items, (r) => enrichVacancies(r))
const badYear = items.filter((r) => {
  const v = Number(r.vacancies) || 0
  return v >= 1900 && v <= 2035
})

console.log('\n=== After UI enrichJobMetadata pipeline ===')
console.log('UI total vacancies (what HomePage sums):', ui.sum)
console.log('jobs with vac>0:', ui.withVac)
console.log('rows with raw year-sized vacancies field:', badYear.length)

console.log('\n=== Hero stat consistency ===')
console.log('Vacancies card value (sum):', ui.sum)
console.log('Vacancies filter (listings with vac>0):', ui.withVac)
console.log('States card value: 36 (STATES.length) — filter uses state-tagged job count, not 36')
