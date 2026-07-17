import { dataJsonUrl } from '@/lib/dataCacheBust'
import { getSupabase } from '@/lib/supabase'
import { resolveJobsSourceMode } from '@/utils/liveJobsPipeline'
import { fetchJobDetailFromStorage } from '@/utils/jobDetailsStorage'
import {
  jobDetailHasRichContent,
  mergeJobDetailPayloads,
} from '@/utils/jobDetailHydration'

export type ApiJob = {
  id: string
  slug: string
  title: string
  dept?: string | null
  category?: string | null
  state_codes?: string[]
  vacancies?: number
  qualification?: string | null
  salary?: string | null
  age_limit?: string | null
  last_date?: string | null
  apply_url?: string | null
  pdf_url?: string | null
  status?: string
  post_name?: string | null
  posts?: Array<{ post_name: string; vacancies?: number; pay_level?: string | null }>
  important_dates?: Array<{ event_key: string; event_date: string }>
  detail?: Record<string, unknown>
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/** Fail fast when backend/proxy is down — avoids multi-minute hangs on Windows */
export const JOBS_FETCH_TIMEOUT_MS = 12_000

/** Static live-jobs-list.json can be ~3 MB on slow mobile networks. */
export const LIVE_JOBS_SNAPSHOT_TIMEOUT_MS = 20_000

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? JOBS_FETCH_TIMEOUT_MS
  const { timeoutMs: _t, ...rest } = init ?? {}
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function promiseWithTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function apiUrl(path: string, params?: Record<string, string | number | undefined>) {
  const base = API_BASE || ''
  const qs = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  return `${base}${path}${qs}`
}

export type FetchJobsResult = {
  items: ApiJob[]
  total: number
  degraded: boolean
}

export async function fetchJobsFromApi(params?: {
  state?: string
  category?: string
  q?: string
  limit?: number
  offset?: number
}): Promise<FetchJobsResult> {
  return fetchJobsList('/api/jobs', params)
}

async function fetchJobsList(
  path: '/api/jobs' | '/api/search',
  params?: {
    state?: string
    category?: string
    q?: string
    limit?: number
    offset?: number
  }
): Promise<FetchJobsResult> {
  try {
    const res = await fetchWithTimeout(
      apiUrl(path, {
        state: params?.state,
        category: params?.category,
        q: params?.q,
        limit: params?.limit ?? 200,
        offset: params?.offset ?? 0,
      }),
      { cache: 'default' }
    )
    if (res.status === 503) return { items: [], total: 0, degraded: true }
    if (!res.ok) return { items: [], total: 0, degraded: false }
    const json = await res.json()
    return {
      items: Array.isArray(json.items) ? json.items : [],
      total: typeof json.total === 'number' ? json.total : json.items?.length ?? 0,
      degraded: Boolean(json.degraded),
    }
  } catch {
    return { items: [], total: 0, degraded: false }
  }
}

export type LiveJobsSnapshot = {
  items: ApiJob[]
  generatedAt?: string | null
  dailySync?: Record<string, unknown> | null
}

export const LIVE_JOBS_BOOTSTRAP_URL = '/data/live-jobs-bootstrap.json'
export const LIVE_JOBS_LIST_URL = '/data/live-jobs-list.json'
export const LIVE_JOBS_FULL_URL = '/data/live-jobs.json'

let snapshotPrefetch: Promise<LiveJobsSnapshot> | null = null
let fullSnapshotPromise: Promise<LiveJobsSnapshot> | null = null

/** Clear in-flight/static snapshot cache (e.g. after a new deploy). */
export function invalidateLiveJobsSnapshotPrefetch(): void {
  snapshotPrefetch = null
  fullSnapshotPromise = null
  if (typeof window !== 'undefined') {
    delete window.__LIVE_JOBS_PREFETCH__
  }
}

declare global {
  interface Window {
    /** Started from index.html inline script before the JS bundle loads. */
    __LIVE_JOBS_PREFETCH__?: Promise<unknown>
  }
}

function loadSnapshotWithEarlyPrefetch(): Promise<LiveJobsSnapshot> {
  if (typeof window === 'undefined') return fetchLiveJobsSnapshotFromNetwork(false)
  const early = window.__LIVE_JOBS_PREFETCH__
  if (!early) return fetchLiveJobsSnapshotFromNetwork(false)
  return early
    .then((json) => parseLiveJobsSnapshot(json))
    .catch(() => ({ items: [] }))
    .then((snap) => (snap.items.length ? snap : fetchLiveJobsSnapshotFromNetwork(false)))
}

/** Start loading the static snapshot before React mounts (faster first paint). */
export function prefetchLiveJobsSnapshot() {
  if (!snapshotPrefetch) {
    snapshotPrefetch = loadSnapshotWithEarlyPrefetch()
  }
  return snapshotPrefetch
}

function parseLiveJobsSnapshot(json: unknown): LiveJobsSnapshot {
  const payload = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const items = Array.isArray(payload.items) ? payload.items : []
  return {
    items: items.slice(0, 8000),
    generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : null,
    dailySync:
      payload.dailySync && typeof payload.dailySync === 'object'
        ? (payload.dailySync as Record<string, unknown>)
        : null,
  }
}

async function fetchSnapshotUrl(url: string, bustCache: boolean): Promise<LiveJobsSnapshot> {
  const requestUrl = bustCache ? `${dataJsonUrl(url)}&t=${Date.now()}` : dataJsonUrl(url)
  try {
    const res = await fetchWithTimeout(requestUrl, {
      cache: bustCache ? 'no-store' : 'default',
      timeoutMs: LIVE_JOBS_SNAPSHOT_TIMEOUT_MS,
    })
    if (!res.ok) return { items: [] }
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('json')) return { items: [] }
    const json = await res.json()
    return parseLiveJobsSnapshot(json)
  } catch {
    return { items: [] }
  }
}

async function fetchLiveJobsSnapshotFromNetwork(bustCache: boolean): Promise<LiveJobsSnapshot> {
  const bootstrap = await fetchSnapshotUrl(LIVE_JOBS_BOOTSTRAP_URL, bustCache)
  if (bootstrap.items.length) return bootstrap
  const listSnap = await fetchSnapshotUrl(LIVE_JOBS_LIST_URL, bustCache)
  if (listSnap.items.length) return listSnap
  return fetchSnapshotUrl(LIVE_JOBS_FULL_URL, bustCache)
}

/** Full catalog (list → full JSON). Used after bootstrap first paint. */
export async function fetchFullLiveJobsSnapshot(bustCache = false): Promise<LiveJobsSnapshot> {
  if (bustCache) {
    fullSnapshotPromise = null
  }
  if (!bustCache && fullSnapshotPromise) {
    return fullSnapshotPromise
  }
  const run = async (): Promise<LiveJobsSnapshot> => {
    const listSnap = await fetchSnapshotUrl(LIVE_JOBS_LIST_URL, bustCache)
    if (listSnap.items.length) return listSnap
    return fetchSnapshotUrl(LIVE_JOBS_FULL_URL, bustCache)
  }
  if (!bustCache) {
    fullSnapshotPromise = run()
    return fullSnapshotPromise
  }
  return run()
}

/** Static snapshot written by daily IngestAgent sync (8 AM IST). */
export async function fetchLiveJobsSnapshot(options?: {
  bustCache?: boolean
}): Promise<LiveJobsSnapshot> {
  const bustCache = Boolean(options?.bustCache)

  if (!bustCache && snapshotPrefetch) {
    return snapshotPrefetch
  }

  const run = async (): Promise<LiveJobsSnapshot> => fetchLiveJobsSnapshotFromNetwork(bustCache)

  if (bustCache) {
    fullSnapshotPromise = null
    snapshotPrefetch = run()
    return snapshotPrefetch
  }

  snapshotPrefetch = run()
  return snapshotPrefetch
}

export type AlertSubscribePayload = {
  channel: 'email' | 'whatsapp' | 'telegram' | 'push'
  channel_address: string
  state_codes?: string[]
  categories?: string[]
  qualification_tags?: string[]
  user_id?: string
  /** Honeypot — bots that fill this are silently rejected server-side. */
  website?: string
  /** Cloudflare Turnstile token when VITE_TURNSTILE_SITE_KEY is set. */
  turnstileToken?: string | null
}

let staticFullCatalogPromise: Promise<ApiJob[] | null> | null = null

async function loadStaticFullCatalog(): Promise<ApiJob[] | null> {
  if (!staticFullCatalogPromise) {
    staticFullCatalogPromise = (async () => {
      try {
        const res = await fetchWithTimeout(dataJsonUrl(LIVE_JOBS_FULL_URL), {
          cache: 'default',
          timeoutMs: LIVE_JOBS_SNAPSHOT_TIMEOUT_MS,
        })
        if (!res.ok) return null
        const json = (await res.json()) as { items?: ApiJob[] }
        return Array.isArray(json.items) ? json.items : null
      } catch {
        return null
      }
    })()
  }
  return staticFullCatalogPromise
}

async function fetchJobFromStaticCatalog(slug: string): Promise<ApiJob | null> {
  const items = await loadStaticFullCatalog()
  if (!items?.length) return null
  return items.find((row) => row.slug === slug || row.id === slug) ?? null
}

async function fetchJobDetailBundle(slug: string): Promise<ApiJob | null> {
  try {
    const stored = await fetchJobDetailFromStorage(slug)
    if (stored && typeof stored === 'object') return stored as ApiJob
  } catch {
    /* fall through */
  }

  try {
    const res = await fetchWithTimeout(
      dataJsonUrl(`/data/job-details/${encodeURIComponent(slug)}.json`),
      { cache: 'default' }
    )
    if (res.ok) {
      return (await res.json()) as ApiJob
    }
  } catch {
    /* no static detail file */
  }

  return null
}

async function hydrateJobDetail(slug: string, base: ApiJob | null): Promise<ApiJob | null> {
  if (base && jobDetailHasRichContent(base)) return base
  const bundle = await fetchJobDetailBundle(slug)
  if (!bundle) return base
  return mergeJobDetailPayloads(base, bundle) ?? bundle
}

export async function fetchJobBySlug(slug: string): Promise<ApiJob | null> {
  if (!slug) return null

  const jobsSource = resolveJobsSourceMode(import.meta.env.VITE_JOBS_SOURCE)
  let base: ApiJob | null = null
  // When VITE_API_URL is unset, Vite proxies /api → :8000. Fail fast if API isn't running.
  const apiTimeoutMs = API_BASE ? JOBS_FETCH_TIMEOUT_MS : 2_500

  if (jobsSource === 'static') {
    base = await fetchJobFromStaticCatalog(slug)
    return hydrateJobDetail(slug, base)
  }

  try {
    const res = await fetchWithTimeout(apiUrl(`/api/jobs/${encodeURIComponent(slug)}`), {
      cache: 'default',
      timeoutMs: apiTimeoutMs,
    })
    if (res.ok) {
      base = (await res.json()) as ApiJob
    }
  } catch {
    /* fall through — local API often not running */
  }

  if (!base) {
    base = await fetchJobFromStaticCatalog(slug)
  }

  if (!base) {
    const supabase = await getSupabase()
    if (supabase) {
      try {
        const { data, error } = await promiseWithTimeout(
          supabase
            .from('jobs')
            .select('*')
            .eq('slug', slug)
            .in('status', ['live', 'expired'])
            .maybeSingle(),
          JOBS_FETCH_TIMEOUT_MS,
          'Supabase job detail'
        )
        if (!error && data) {
          const job = data as ApiJob
          const [postsRes, datesRes] = await promiseWithTimeout(
            Promise.all([
              supabase.from('job_posts').select('post_name,vacancies,pay_level').eq('job_id', job.id),
              supabase.from('job_dates').select('event_key,event_date').eq('job_id', job.id),
            ]),
            JOBS_FETCH_TIMEOUT_MS,
            'Supabase job detail relations'
          )
          if (postsRes.data?.length) job.posts = postsRes.data
          if (datesRes.data?.length) job.important_dates = datesRes.data
          base = job
        }
      } catch {
        /* fall through to detail bundle */
      }
    }
  }

  return hydrateJobDetail(slug, base)
}

async function subscribeToAlertsViaSupabase(
  payload: AlertSubscribePayload
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (payload.website?.trim()) {
    return { ok: true, id: 'ok' }
  }
  const supabase = await getSupabase()
  if (!supabase) {
    console.warn('[jobsApi] alert subscribe unavailable — auth not configured')
    return { ok: false, error: 'unavailable' }
  }

  const { data, error } = await supabase
    .from('alert_subscriptions')
    .insert({
      channel: payload.channel,
      channel_address: payload.channel_address.trim(),
      state_codes: payload.state_codes ?? [],
      categories: payload.categories ?? [],
      qualification_tags: payload.qualification_tags ?? [],
      ...(payload.user_id ? { user_id: payload.user_id } : {}),
    })
    .select('id')
    .single()

  if (error) {
    console.warn('[jobsApi] alert subscribe failed', error.message)
    return { ok: false, error: 'failed' }
  }
  return { ok: true, id: String(data?.id ?? 'subscribed') }
}

export async function subscribeToAlerts(
  payload: AlertSubscribePayload
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!API_BASE) {
    return subscribeToAlertsViaSupabase(payload)
  }

  try {
    const { turnstileToken, ...body } = payload
    const { turnstileHeaders } = await import('@/lib/turnstile')
    const res = await fetch(apiUrl('/api/alerts/subscribe'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...turnstileHeaders(turnstileToken),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[jobsApi] alert API failed', res.status, text.slice(0, 200))
      const fallback = await subscribeToAlertsViaSupabase(payload)
      if (fallback.ok) return fallback
      return { ok: false, error: 'failed' }
    }
    const json = await res.json()
    return { ok: true, id: String(json.id ?? 'subscribed') }
  } catch (err) {
    console.warn('[jobsApi] alert network error', err)
    const fallback = await subscribeToAlertsViaSupabase(payload)
    if (fallback.ok) return fallback
    return { ok: false, error: 'Network error' }
  }
}
