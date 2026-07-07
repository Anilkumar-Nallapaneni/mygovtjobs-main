import {
  fetchJobsFromApi,
  fetchFullLiveJobsSnapshot,
  fetchLiveJobsSnapshot,
  JOBS_FETCH_TIMEOUT_MS,
} from '@/lib/jobsApi'
import {
  dailySyncFromJsonPayload,
  type DailySyncMeta,
} from '@/lib/dailySync'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { JobRecord } from '@/types/job'
import {
  INITIAL_LIVE_ROWS,
  MAX_LIVE_ROWS,
  processLiveJobPayload,
  processLiveJobPayloadAsync,
  resolveJobsSourceMode,
  sourceOrder,
  type JobsSourceMode,
} from '@/utils/liveJobsPipeline'

const SUPABASE_PAGE = 1000
const JSON_CAP = 8000
const DEMO_SLUG_PREFIX = /^demo-/
const API_PAGE = 1000

export type LiveJobsCatalogResult = {
  rows: JobRecord[]
  sources: string[]
  hasBackend: boolean
  error: string | null
  dailySync: DailySyncMeta | null
  /** Raw payload size — used for background Supabase refresh heuristics. */
  rawLength: number
}

export function getJobsSourceMode(): JobsSourceMode {
  return resolveJobsSourceMode(import.meta.env.VITE_JOBS_SOURCE)
}

export function liveJobsQueryKey(source: JobsSourceMode, refetchGeneration = 0) {
  return ['live-jobs', source, refetchGeneration] as const
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

const LIST_DETAIL_KEYS = [
  'source',
  'summary',
  'pdf_urls',
  'pdfUrls',
  'published',
  'apply_url',
  'official_url',
  'notification_url',
  'link',
  'source_url',
] as const

function trimRowForList(row: Record<string, unknown>) {
  const detail = row.detail
  if (!detail || typeof detail !== 'object') return row
  const raw = detail as Record<string, unknown>
  const d: Record<string, unknown> = {}
  for (const key of LIST_DETAIL_KEYS) {
    if (key in raw) d[key] = raw[key]
  }
  const summary = d.summary
  if (typeof summary === 'string' && summary.length > 400) {
    d.summary = `${summary.slice(0, 400)}…`
  }
  for (const key of ['pdf_urls', 'pdfUrls'] as const) {
    const list = d[key]
    if (Array.isArray(list) && list.length > 4) {
      d[key] = list.slice(0, 4)
    }
  }
  return { ...row, detail: d }
}

async function fetchSupabasePage(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  offset: number,
  rangeEnd: number
) {
  if (!supabase) return []
  const select =
    'id,slug,title,dept,category,state_codes,vacancies,qualification,salary,age_limit,last_date,apply_url,status,published_at,updated_at,detail(source,summary,pdf_urls,pdfUrls,published,post_name,dates,fee,selection,howApply,notification_url,source_url,link,apply_url)'

  const query = supabase
    .from('jobs')
    .select(select)
    .eq('status', 'live')
    .order('published_at', { ascending: false })
    .range(offset, rangeEnd)

  const { data, error } = await withTimeout(
    Promise.resolve(query) as Promise<{
      data: Record<string, unknown>[] | null
      error: { message: string } | null
    }>,
    JOBS_FETCH_TIMEOUT_MS,
    'Supabase jobs'
  )

  if (error) {
    console.warn('[liveJobs] Supabase:', error.message)
    return []
  }
  return (data || []).map((row) => trimRowForList(row as Record<string, unknown>))
}

async function fetchJobsFromSupabase({
  startOffset = 0,
  maxRows = MAX_LIVE_ROWS,
}: {
  startOffset?: number
  maxRows?: number
} = {}) {
  const supabase = await getSupabase()
  if (!supabase) return []

  const endOffset = Math.min(MAX_LIVE_ROWS, startOffset + maxRows)
  const pageStarts: number[] = []
  for (let offset = startOffset; offset < endOffset; offset += SUPABASE_PAGE) {
    pageStarts.push(offset)
  }

  const pages = await Promise.all(
    pageStarts.map((offset) => {
      const rangeEnd = Math.min(offset + SUPABASE_PAGE - 1, endOffset - 1)
      return fetchSupabasePage(supabase, offset, rangeEnd)
    })
  )

  const all: Array<Record<string, unknown>> = []
  for (const batch of pages) {
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < SUPABASE_PAGE) break
  }
  return all
}

function rowSource(row: Record<string, unknown>) {
  const detail = row.detail
  return detail && typeof detail === 'object' ? (detail as Record<string, unknown>).source : ''
}

function supabasePayload(rows: Array<Record<string, unknown>>) {
  const real = rows.filter(
    (r) => !DEMO_SLUG_PREFIX.test(String(r?.slug || '')) && rowSource(r) !== 'demo'
  )
  if (!real.length) return null
  return { raw: real, sources: ['supabase'], hasBackend: true, error: null as string | null }
}

async function fetchAllFromApi() {
  const first = await fetchJobsFromApi({ limit: API_PAGE, offset: 0 })
  if (first.degraded || !first.items.length) return { items: [], degraded: first.degraded }
  let items = [...first.items]
  const total = Math.min(first.total || items.length, MAX_LIVE_ROWS)
  let offset = items.length
  while (items.length < total && offset < MAX_LIVE_ROWS) {
    const page = await fetchJobsFromApi({
      limit: Math.min(API_PAGE, total - items.length, MAX_LIVE_ROWS - items.length),
      offset,
    })
    if (page.degraded || !page.items.length) break
    items = items.concat(page.items)
    offset += page.items.length
    if (page.items.length < API_PAGE) break
  }
  return { items, degraded: false, total: first.total || items.length }
}

async function tryStatic(bustCache = false) {
  const snap = await fetchLiveJobsSnapshot({ bustCache })
  if (!snap.items.length) return null
  return {
    raw: snap.items.slice(0, JSON_CAP).filter((r) => !r.status || r.status !== 'draft'),
    sources: ['official-sites'],
    hasBackend: true,
    error: null as string | null,
    dailySync: dailySyncFromJsonPayload({
      dailySync: snap.dailySync,
      generatedAt: snap.generatedAt,
    }),
  }
}

async function trySupabase(maxRows = MAX_LIVE_ROWS) {
  const supaRows = await fetchJobsFromSupabase({ maxRows })
  return supabasePayload(supaRows)
}

async function tryApi() {
  const apiResult = await fetchAllFromApi()
  if (!apiResult.items.length || apiResult.degraded) return null
  return {
    raw: apiResult.items.filter((r) => r.status !== 'draft'),
    sources: ['api'],
    hasBackend: true,
    error: null as string | null,
  }
}

async function processPayloadRows(
  raw: unknown[],
  onProgress?: (rows: JobRecord[]) => void
) {
  if (raw.length <= INITIAL_LIVE_ROWS) {
    return processLiveJobPayload(raw).rows
  }
  const { rows } = await processLiveJobPayloadAsync(raw, onProgress)
  return rows
}

type RawPayload = {
  raw: unknown[]
  sources: string[]
  hasBackend: boolean
  error: string | null
  dailySync?: DailySyncMeta | null
}

async function loadJobsPayload(bustCache = false, jobsSource = getJobsSourceMode()) {
  if (jobsSource === 'static') {
    const hit = await tryStatic(bustCache)
    if (hit) return hit
    return { raw: [], sources: ['static'], hasBackend: false, error: 'live-jobs.json missing or empty' }
  }

  const isExplicitSource = jobsSource !== 'auto'
  const order = sourceOrder(jobsSource)

  const runStep = async (step: 'static' | 'supabase' | 'api') => {
    if (step === 'static') return tryStatic(bustCache)
    if (step === 'supabase' && isSupabaseConfigured()) {
      const maxRows = jobsSource === 'supabase' ? INITIAL_LIVE_ROWS : MAX_LIVE_ROWS
      return trySupabase(maxRows)
    }
    if (step === 'api') return tryApi()
    return null
  }

  for (const step of order) {
    const hit = await runStep(step)
    if (hit) return hit
  }

  if (!isExplicitSource) {
    const apiResult = await fetchJobsFromApi({ limit: API_PAGE })
    if (apiResult.degraded) {
      return {
        raw: [],
        sources: ['static'],
        hasBackend: false,
        error: 'Job database temporarily unavailable',
      }
    }
    if (apiResult.items.length) {
      return {
        raw: apiResult.items.filter((r) => r.status !== 'draft'),
        sources: ['api'],
        hasBackend: true,
        error: null,
      }
    }
  }

  return { raw: [], sources: ['static'], hasBackend: false, error: null }
}

function toCatalogResult(
  payload: RawPayload,
  rows: JobRecord[],
  dailySyncFallback: DailySyncMeta | null
): LiveJobsCatalogResult {
  const dailySync = payload.dailySync ?? dailySyncFallback
  return {
    rows,
    sources: payload.sources,
    hasBackend: payload.hasBackend,
    error: payload.error,
    dailySync: dailySync || null,
    rawLength: payload.raw.length,
  }
}

/** Fetch and normalize the live jobs catalog (TanStack Query queryFn). */
export async function fetchLiveJobsCatalog(
  bustCache = false,
  onPartial?: (partial: LiveJobsCatalogResult) => void,
  dailySyncFallback: DailySyncMeta | null = null,
  jobsSource = getJobsSourceMode()
): Promise<LiveJobsCatalogResult> {
  const payload = await loadJobsPayload(bustCache, jobsSource)

  let rows: JobRecord[]

  if (payload.raw.length > INITIAL_LIVE_ROWS) {
    const partialRows = processLiveJobPayload(payload.raw.slice(0, INITIAL_LIVE_ROWS)).rows
    if (partialRows.length && onPartial) {
      onPartial(toCatalogResult(payload, partialRows, dailySyncFallback))
    }
    rows = await processPayloadRows(payload.raw, (progressRows) => {
      if (!onPartial || progressRows.length <= partialRows.length) return
      onPartial(toCatalogResult(payload, progressRows, dailySyncFallback))
    })
  } else {
    rows = processLiveJobPayload(payload.raw).rows
  }

  let result = toCatalogResult(payload, rows, dailySyncFallback)

  const isBootstrap =
    payload.sources.includes('official-sites') && payload.raw.length <= INITIAL_LIVE_ROWS

  if (isBootstrap) {
    const hydrateFull = async (): Promise<LiveJobsCatalogResult | null> => {
      const fullSnap = await fetchFullLiveJobsSnapshot(bustCache)
      if (fullSnap.items.length <= payload.raw.length) return null
      const fullPayload: RawPayload = {
        ...payload,
        raw: fullSnap.items
          .slice(0, JSON_CAP)
          .filter((r) => !r.status || r.status !== 'draft'),
        dailySync:
          dailySyncFromJsonPayload({
            dailySync: fullSnap.dailySync,
            generatedAt: fullSnap.generatedAt,
          }) ?? ('dailySync' in payload ? payload.dailySync : null),
      }
      const fullRows = await processPayloadRows(
        fullPayload.raw,
        onPartial
          ? (progressRows) => {
              if (progressRows.length <= rows.length) return
              onPartial(toCatalogResult(fullPayload, progressRows, dailySyncFallback))
            }
          : undefined
      )
      if (fullRows.length <= rows.length) return null
      return toCatalogResult(fullPayload, fullRows, dailySyncFallback)
    }

    if (onPartial) {
      void hydrateFull().then((fullResult) => {
        if (fullResult) onPartial(fullResult)
      })
    } else {
      const fullResult = await hydrateFull()
      if (fullResult) result = fullResult
    }
  }

  return result
}

export function needsSupabaseBackgroundRefresh(
  data: LiveJobsCatalogResult,
  jobsSource = getJobsSourceMode()
): boolean {
  if (!isSupabaseConfigured()) return false
  if (jobsSource === 'static' || jobsSource === 'api') return false
  const usedStatic = data.sources.includes('official-sites')
  const usedSupabase = data.sources.includes('supabase')
  return usedStatic || (usedSupabase && data.rawLength >= INITIAL_LIVE_ROWS)
}

export async function refreshSupabaseCatalog(
  dailySyncFallback: DailySyncMeta | null
): Promise<LiveJobsCatalogResult | null> {
  try {
    const supaRows = await fetchJobsFromSupabase({ maxRows: MAX_LIVE_ROWS })
    const livePayload = supabasePayload(supaRows)
    if (!livePayload) return null
    const liveRows = await processPayloadRows(livePayload.raw)
    if (!liveRows.length) return null
    return {
      rows: liveRows,
      sources: livePayload.sources,
      hasBackend: livePayload.hasBackend,
      error: livePayload.error,
      dailySync: dailySyncFallback,
      rawLength: livePayload.raw.length,
    }
  } catch (e) {
    console.warn('[liveJobs] Supabase background refresh failed:', e)
    return null
  }
}
