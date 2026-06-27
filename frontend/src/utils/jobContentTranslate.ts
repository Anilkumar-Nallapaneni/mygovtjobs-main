import type { JobRecord } from '@/types/job'

const EN_CACHE_PREFIX = 'mgj-en-v1:'
const MAX_CHUNK = 480

const SCRIPT_DETECTORS: Array<{ re: RegExp; lang: string }> = [
  { re: /\p{Script=Devanagari}/u, lang: 'hi' },
  { re: /\p{Script=Bengali}/u, lang: 'bn' },
  { re: /\p{Script=Tamil}/u, lang: 'ta' },
  { re: /\p{Script=Telugu}/u, lang: 'te' },
  { re: /\p{Script=Gujarati}/u, lang: 'gu' },
  { re: /\p{Script=Kannada}/u, lang: 'kn' },
  { re: /\p{Script=Malayalam}/u, lang: 'ml' },
  { re: /\p{Script=Gurmukhi}/u, lang: 'pa' },
  { re: /\p{Script=Oriya}/u, lang: 'or' },
  { re: /\p{Script=Arabic}/u, lang: 'ur' },
]

function hashText(text: string): string {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

function enCacheKey(text: string): string {
  return `${EN_CACHE_PREFIX}${hashText(text)}`
}

export function getCachedEnglishNormalization(text: string): string | null {
  if (!text?.trim()) return null
  try {
    return sessionStorage.getItem(enCacheKey(text))
  } catch {
    return null
  }
}

function writeEnCache(source: string, english: string) {
  try {
    sessionStorage.setItem(enCacheKey(source), english)
  } catch {
    /* quota */
  }
}

/** Detect if text is primarily non-Latin (Indian scripts). */
export function detectSourceLanguage(text: string): string {
  const s = String(text || '')
  for (const { re, lang } of SCRIPT_DETECTORS) {
    if (re.test(s)) return lang
  }
  return 'en'
}

export function needsEnglishNormalization(text: string): boolean {
  return detectSourceLanguage(text) !== 'en'
}

function shouldNormalize(text: string): boolean {
  const s = text.trim()
  if (s.length < 2) return false
  if (/^https?:\/\//i.test(s)) return false
  if (/^[\d\s./:-]+$/.test(s)) return false
  return needsEnglishNormalization(s)
}

async function fetchLangPair(text: string, from: string, to: string): Promise<string | null> {
  const chunk = text.length > MAX_CHUNK ? `${text.slice(0, MAX_CHUNK)}…` : text
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${from}|${to}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { responseData?: { translatedText?: string } }
    const out = data.responseData?.translatedText?.trim()
    return out || null
  } catch {
    return null
  }
}

/** Canonical job text is always English — normalize regional scripts via translation API. */
export async function normalizeToEnglish(text: string): Promise<string> {
  const source = String(text ?? '').trim()
  if (!source || !shouldNormalize(source)) return text

  const cached = getCachedEnglishNormalization(source)
  if (cached) return cached

  const from = detectSourceLanguage(source)
  const out = await fetchLangPair(source, from, 'en')
  if (out && out.toLowerCase() !== source.toLowerCase()) {
    writeEnCache(source, out)
    return out
  }
  return text
}

async function mapNormalize(items: string[], concurrency = 4): Promise<string[]> {
  const out = [...items]
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await normalizeToEnglish(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return out
}

type ContentSection = {
  heading?: string
  paragraphs?: string[]
  lists?: string[][]
  tables?: Record<string, string>[][]
  links?: { label?: string; url?: string }[]
}

function isDateColumnKey(key: string): boolean {
  return /^date$/i.test(key)
}

async function normalizeTableRow(row: Record<string, string>): Promise<Record<string, string>> {
  const out: Record<string, string> = { ...row }
  await Promise.all(
    Object.entries(row).map(async ([key, value]) => {
      if (typeof value !== 'string' || !value.trim()) return
      if (isDateColumnKey(key)) return
      out[key] = await normalizeToEnglish(value)
    })
  )
  return out
}

async function normalizeTables(tables: Record<string, string>[][]): Promise<Record<string, string>[][]> {
  return Promise.all(tables.map((table) => Promise.all(table.map((row) => normalizeTableRow(row)))))
}

async function normalizeSections(sections: ContentSection[]): Promise<ContentSection[]> {
  return Promise.all(
    sections.map(async (sec) => {
      const paragraphs = sec.paragraphs?.length
        ? await mapNormalize(sec.paragraphs)
        : sec.paragraphs
      const lists = sec.lists?.length
        ? Promise.all(sec.lists.map((list) => mapNormalize(list)))
        : sec.lists
      const heading = sec.heading ? await normalizeToEnglish(sec.heading) : sec.heading
      const tables = sec.tables?.length ? await normalizeTables(sec.tables) : sec.tables
      const links = sec.links?.length
        ? Promise.all(
            sec.links.map(async (link) => ({
              ...link,
              label: link.label ? await normalizeToEnglish(link.label) : link.label,
            }))
          )
        : sec.links
      return {
        ...sec,
        heading,
        paragraphs,
        lists: await lists,
        tables,
        links: await links,
      }
    })
  )
}

export function jobNeedsNormalization(job: JobRecord): boolean {
  const fields = [
    job.title,
    job.about,
    job.qual,
    job.salary,
    job.age,
    job.dept,
    job.post_name,
    job.detail?.summary,
  ]
  if (fields.some((f) => f && needsEnglishNormalization(String(f)))) return true
  const sections = job.detail?.content_sections
  if (!Array.isArray(sections)) return false
  return sections.some((sec) => {
    const s = sec as ContentSection
    if (s.heading && needsEnglishNormalization(s.heading)) return true
    if (s.paragraphs?.some((p) => needsEnglishNormalization(p))) return true
    if (s.lists?.some((list) => list.some((item) => needsEnglishNormalization(item)))) return true
    if (
      s.tables?.some((table) =>
        table.some((row) =>
          Object.entries(row).some(
            ([key, value]) => !isDateColumnKey(key) && typeof value === 'string' && needsEnglishNormalization(value)
          )
        )
      )
    ) {
      return true
    }
    if (s.links?.some((link) => link.label && needsEnglishNormalization(link.label))) return true
    return false
  })
}

/** Normalize all user-visible job fields to English (canonical original language). */
export async function normalizeJobRecordToEnglish(job: JobRecord): Promise<JobRecord> {
  if (!job || !jobNeedsNormalization(job)) return job

  const detail =
    job.detail && typeof job.detail === 'object' ? { ...job.detail } : ({} as JobRecord['detail'])

  const selection = Array.isArray(job.selection) ? [...job.selection] : []
  const howApply = Array.isArray(job.howApply) ? [...job.howApply] : []
  const sections = Array.isArray(detail.content_sections)
    ? (detail.content_sections as ContentSection[])
    : []

  const summarySource = typeof detail.summary === 'string' ? detail.summary : ''
  const [title, about, summary, qual, salary, age, dept, postName] = await mapNormalize(
    [
      job.title || '',
      job.about || '',
      summarySource,
      String(job.qual || ''),
      String(job.salary || ''),
      String(job.age || job.detail?.age || ''),
      String(job.dept || ''),
      String(job.post_name || job.detail?.post_name || ''),
    ]
  )

  const normalizedSelection = selection.length ? await mapNormalize(selection) : selection
  const normalizedHowApply = howApply.length ? await mapNormalize(howApply) : howApply
  const normalizedSections = sections.length ? await normalizeSections(sections) : sections

  return {
    ...job,
    title: title || job.title,
    about: about || job.about,
    qual: qual || job.qual,
    salary: salary || job.salary,
    age: age || job.age,
    dept: dept || job.dept,
    post_name: postName || job.post_name,
    selection: normalizedSelection,
    howApply: normalizedHowApply,
    detail: {
      ...detail,
      summary: summary || summarySource,
      post_name: postName || detail.post_name,
      content_sections: normalizedSections.length ? normalizedSections : detail.content_sections,
    },
  }
}
