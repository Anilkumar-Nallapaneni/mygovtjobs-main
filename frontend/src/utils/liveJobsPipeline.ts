import { adaptLiveJob } from '@/utils/liveJobAdapter'
import { isJobExpired } from '@/utils/jobFilters'
import { isPortalNoiseJob } from '@/utils/jobNoiseFilter'
import { isAllowedOfficialJob, rowHasBlockedHost } from '@/utils/officialDomains'
import type { JobRecord } from '@/types/job'
import { hasPublicationMetadata, meetsPublicJobPolicy } from '@/utils/publicJobPolicy'

const RECRUIT_RE =
  /recruit|vacanc|notif|advert|exam|bharti|apply|post|constable|group[\s-]*[i1-4]|cgl|ntpc|psc|ssc|upsc|railway|bank|police|teacher|defence|apprentice|walk-?in|selection|appointment|fellowship|intern|project\s+staff|ldc|udc|mts|technician|nurse|medical|faculty|professor|lecturer|manager|staff|opening|hire|engagement|advt|bharti/i

/** Broader hint for official rows that lack classic recruitment keywords in the title. */
const OFFICIAL_JOB_HINT_RE =
  /post|vacanc|assistant|clerk|engineer|officer|group|advt|notification|recruit|apprentice|fellow|resident|specialist|technician|nurse|faculty|professor|lecturer|manager|staff|fellowship|intern|walk-?in|bharti|selection|engagement/i

export const MAX_LIVE_ROWS = 8000

/** First paint: process/fetch this many rows, then fill the catalog in the background. */
export const INITIAL_LIVE_ROWS = 80

export type CatalogStats = {
  totalNotices: number
  vacancies: number
  noticesWithVacancies: number
  liveNotices: number
}

export type JobsSourceMode = 'auto' | 'static' | 'api' | 'supabase'

export function resolveJobsSourceMode(raw: string | undefined): JobsSourceMode {
  const v = (raw || 'auto').toLowerCase()
  if (v === 'static' || v === 'api' || v === 'supabase') return v
  return 'auto'
}

export function sourceOrder(mode: JobsSourceMode): Array<'static' | 'supabase' | 'api'> {
  if (mode === 'static') return ['static']
  if (mode === 'api') return ['api', 'supabase', 'static']
  // supabase + auto: paint CDN snapshot first, then refresh from DB in background
  return ['static', 'supabase', 'api']
}

export function isUsefulLiveRow(row: Record<string, unknown>) {
  const title = String(row?.title || '').trim()
  if (!title || title.length < 6) return false
  if (isPortalNoiseJob(row)) return false
  if (rowHasBlockedHost(row)) return false
  if (!isAllowedOfficialJob(row)) return false
  if (/^\{\{.*\}\}$/.test(title)) return false
  if (/translate\s*\}\}/i.test(title)) return false
  const status = String(row?.status || '').toLowerCase()
  if (status === 'draft' || status === 'pending') return false

  if (hasPublicationMetadata(row) && !meetsPublicJobPolicy(row)) return false

  if (vacancyCount(row) > 0) return true
  if (RECRUIT_RE.test(title) || RECRUIT_RE.test(String(row?.dept || ''))) return true
  // Official portal rows with apply link + deadline often omit "recruitment" in the title.
  const hasApply = Boolean(row?.apply_url || row?.applyUrl)
  const hasDeadline = Boolean(row?.last_date || row?.lastDate)
  if (hasApply && hasDeadline && title.length >= 10 && OFFICIAL_JOB_HINT_RE.test(title)) return true
  return false
}

function scoreLiveRow(row: Record<string, unknown>) {
  const title = String(row?.title || '')
  let score = 0
  if (isPortalNoiseJob(row)) score -= 10
  if (RECRUIT_RE.test(title)) score += 3
  if (Number(row?.vacancies) > 0) score += 2
  if (row?.last_date) score += 1
  if (Array.isArray(row?.state_codes) && row.state_codes.length) score += 1
  return score
}

function vacancyCount(row: Record<string, unknown>) {
  // Use sanitized `vacancies` only — never fall back to rawVacancies (result/cutoff
  // PDFs often store candidate counts that enrichment correctly zeros).
  if (row?.vacancies !== undefined && row?.vacancies !== null) {
    return Number(row.vacancies) || 0
  }
  return Number((row as { rawVacancies?: number }).rawVacancies) || 0
}

export function dedupeLiveRows(rows: unknown[]) {
  const seen = new Set<string>()
  const out: unknown[] = []
  const sorted = [...rows].sort(
    (a, b) => scoreLiveRow(b as Record<string, unknown>) - scoreLiveRow(a as Record<string, unknown>)
  )
  for (const row of sorted) {
    if (!isUsefulLiveRow(row as Record<string, unknown>)) continue
    const slug = String((row as Record<string, unknown>)?.slug || (row as Record<string, unknown>)?.id || '').trim()
    if (!slug) continue
    const key = slug.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
    if (out.length >= MAX_LIVE_ROWS) break
  }
  return out
}

/** Aggregate hero/headline numbers from jobs shown in browse UI (live only). */
export function statsFromRows(rows: JobRecord[], nowMs: number = Date.now()): CatalogStats {
  let vacancies = 0
  let noticesWithVacancies = 0
  let liveNotices = 0
  for (const row of rows) {
    if (isJobExpired(row, nowMs)) continue
    liveNotices += 1
    const count = vacancyCount(row as Record<string, unknown>)
    if (count > 0) {
      vacancies += count
      noticesWithVacancies += 1
    }
  }
  return {
    totalNotices: liveNotices,
    vacancies,
    noticesWithVacancies,
    liveNotices,
  }
}

export function processLiveJobPayload(raw: unknown[], nowMs: number = Date.now()) {
  const rows = dedupeLiveRows(raw).map((row, i) => adaptLiveJob(row as Record<string, unknown>, i, nowMs))
  return { rows, stats: statsFromRows(rows, nowMs) }
}

/** Rows adapted per idle slice — keeps the main thread responsive during large JSON catalogs. */
export const LIVE_JOBS_PROCESS_CHUNK = 120

/** Yield so clicks, map, and scroll stay responsive while jobs normalize. */
export function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 120 })
      return
    }
    setTimeout(resolve, 0)
  })
}

export async function processLiveJobPayloadAsync(
  raw: unknown[],
  onProgress?: (rows: JobRecord[]) => void,
  nowMs: number = Date.now()
): Promise<{ rows: JobRecord[]; stats: CatalogStats }> {
  const deduped = dedupeLiveRows(raw)
  const rows: JobRecord[] = []

  for (let i = 0; i < deduped.length; i += LIVE_JOBS_PROCESS_CHUNK) {
    const slice = deduped.slice(i, i + LIVE_JOBS_PROCESS_CHUNK)
    for (let j = 0; j < slice.length; j++) {
      rows.push(adaptLiveJob(slice[j] as Record<string, unknown>, i + j, nowMs))
    }
    if (onProgress && rows.length) onProgress(rows)
    if (i + LIVE_JOBS_PROCESS_CHUNK < deduped.length) {
      await yieldToMainThread()
    }
  }
  return { rows, stats: statsFromRows(rows, nowMs) }
}
