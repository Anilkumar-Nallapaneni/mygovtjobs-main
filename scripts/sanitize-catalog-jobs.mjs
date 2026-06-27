#!/usr/bin/env node
/**
 * Strip aggregator catalog metadata from static job JSON — keep jobs, remove FJA branding.
 * Does NOT delete rows; only cleans detail.source, data_origin, and blocked URLs in sections.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIVE_JSON = path.join(ROOT, 'frontend/public/data/live-jobs.json')
const DETAILS_DIR = path.join(ROOT, 'frontend/public/data/job-details')

const BLOCKED_HOST = /freejobalert\.com|t\.me\/freejobalert|fjajobsbot|instagram\.com\/freejobalert|youtube\.com\/@freejobalert/i
const BLOCKED_TEXT = /freejobalert|\bfja\b|download\s*mobile\s*app|join\s*telegram|join\s*whatsapp/i

function isBlockedUrl(url) {
  return !url || BLOCKED_HOST.test(String(url))
}

function cleanText(text) {
  if (!text || typeof text !== 'string') return text
  let out = text.replace(/www\.freejobalert\.com/gi, '').replace(/download\s*mobile\s*app/gi, '')
  out = out.replace(/\s{2,}/g, ' ').trim()
  if (!out || BLOCKED_TEXT.test(out)) return null
  return out
}

function cleanLinks(links) {
  if (!Array.isArray(links)) return links
  return links
    .filter((link) => link && !isBlockedUrl(link.url))
    .map((link) => ({
      ...link,
      label: cleanText(link.label) || link.label,
    }))
}

function cleanSections(sections) {
  if (!Array.isArray(sections)) return sections
  return sections
    .map((sec) => {
      const heading = cleanText(sec?.heading)
      const paragraphs = Array.isArray(sec?.paragraphs)
        ? sec.paragraphs.map(cleanText).filter(Boolean)
        : sec?.paragraphs
      const lists = Array.isArray(sec?.lists)
        ? sec.lists.map((list) => (Array.isArray(list) ? list.map(cleanText).filter(Boolean) : list))
        : sec?.lists
      const links = cleanLinks(sec?.links)
      return { ...sec, heading: heading || sec?.heading, paragraphs, lists, links }
    })
    .filter((sec) => sec.heading || sec.paragraphs?.length || sec.lists?.length || sec.links?.length)
}

function sanitizeDetail(detail) {
  if (!detail || typeof detail !== 'object') return detail
  const d = { ...detail }
  delete d.data_origin
  if (d.source === 'structured-import' || d.source === 'fja-import') {
    d.source = 'official-sites'
  }
  if (Array.isArray(d.content_sections)) {
    d.content_sections = cleanSections(d.content_sections)
  }
  if (Array.isArray(d.apply_links)) {
    d.apply_links = d.apply_links.filter((l) => l && !isBlockedUrl(l.url))
  }
  if (d.summary) {
    const s = cleanText(String(d.summary))
    if (s) d.summary = s
    else delete d.summary
  }
  return d
}

function sanitizeRow(row) {
  const out = { ...row }
  if (out.apply_url && isBlockedUrl(out.apply_url)) out.apply_url = null
  if (out.pdf_url && isBlockedUrl(out.pdf_url)) out.pdf_url = null
  out.detail = sanitizeDetail(out.detail)
  return out
}

function sanitizeLiveJobs() {
  if (!fs.existsSync(LIVE_JSON)) {
    console.log('live-jobs.json not found — skip')
    return { total: 0, cleaned: 0 }
  }
  const payload = JSON.parse(fs.readFileSync(LIVE_JSON, 'utf8'))
  const items = Array.isArray(payload.items) ? payload.items : []
  let cleaned = 0
  const next = items.map((row) => {
    const hadCatalog =
      row?.detail?.data_origin === 'freejobalert' ||
      row?.detail?.source === 'structured-import' ||
      row?.detail?.source === 'fja-import'
    const sanitized = sanitizeRow(row)
    if (hadCatalog) cleaned += 1
    return sanitized
  })
  payload.items = next
  payload.generatedAt = new Date().toISOString()
  fs.writeFileSync(LIVE_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return { total: next.length, cleaned }
}

function sanitizeJobDetails() {
  if (!fs.existsSync(DETAILS_DIR)) return 0
  let count = 0
  for (const name of fs.readdirSync(DETAILS_DIR)) {
    if (!name.endsWith('.json')) continue
    const file = path.join(DETAILS_DIR, name)
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    const detail = raw.detail || raw
    const hadCatalog =
      detail?.data_origin === 'freejobalert' ||
      detail?.source === 'structured-import' ||
      detail?.source === 'fja-import'
    const next = sanitizeRow(raw.detail ? { ...raw, detail: sanitizeDetail(detail) } : sanitizeDetail(raw))
    if (hadCatalog) count += 1
    fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  }
  return count
}

const live = sanitizeLiveJobs()
const details = sanitizeJobDetails()
console.log(
  `Sanitize complete: live-jobs=${live.total} (${live.cleaned} catalog metadata cleaned), job-details files=${details}`
)
