/** Daily 8 AM IST sync metadata from API or live-jobs.json snapshot. */

import { dataJsonUrl } from '@/lib/dataCacheBust'
import { dateTimeLocale } from '@/utils/formatLocale'

export type DailySyncMeta = {
  completedAt?: string | null
  completedAtIst?: string | null
  dateIst?: string | null
  nextRunAtIst?: string | null
  jobCount?: number | null
  sourcesScraped?: number | null
  scheduledLabel?: string | null
}

export type SyncStatusResponse = {
  timezone?: string
  scheduledHourIst?: number
  scheduledMinuteIst?: number
  enforceOncePerDay?: boolean
  ranTodayIst?: boolean
  canRunNow?: boolean
  isRunning?: boolean
  status?: string
  lastCompletedAt?: string | null
  lastCompletedAtIst?: string | null
  lastCompletedDateIst?: string | null
  nextRunAtIst?: string | null
  jobCount?: number | null
  sourcesScraped?: number | null
  error?: string | null
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function formatIstDisplay(iso: string | null | undefined, locale = 'en'): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString(dateTimeLocale(locale), {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Human-readable recency for sync labels — e.g. "2h ago", "yesterday". */
export function formatRelativeIstAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 0) return 'just now'
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return ''
}

export async function fetchDailySyncMeta(): Promise<DailySyncMeta | null> {
  try {
    const res = await fetch(dataJsonUrl('/data/daily-sync-state.json'), { cache: 'no-cache' })
    if (!res.ok) return null
    const json = (await res.json()) as Record<string, unknown>
    if (!json || typeof json !== 'object') return null
    return json as DailySyncMeta
  } catch {
    return null
  }
}

export function dailySyncFromJsonPayload(json: Record<string, unknown> | null | undefined): DailySyncMeta | null {
  const block = json?.dailySync
  if (!block || typeof block !== 'object') return null
  return block as DailySyncMeta
}

export async function fetchSyncStatus(): Promise<SyncStatusResponse | null> {
  if (!API_BASE) return null
  try {
    const res = await fetch(`${API_BASE}/api/meta/sync-status`, { cache: 'default' })
    if (!res.ok) return null
    return (await res.json()) as SyncStatusResponse
  } catch {
    return null
  }
}

export function dailySyncLabel(
  meta: DailySyncMeta | null,
  api: SyncStatusResponse | null,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const completed = meta?.completedAtIst || api?.lastCompletedAtIst || meta?.completedAt || api?.lastCompletedAt
  const next = meta?.nextRunAtIst || api?.nextRunAtIst
  const scheduled =
    meta?.scheduledLabel ||
    (api?.scheduledHourIst != null
      ? `${api.scheduledHourIst}:${String(api.scheduledMinuteIst ?? 0).padStart(2, '0')} AM IST daily`
      : '8:00 AM IST daily')

  if (completed) {
    const relative = formatRelativeIstAgo(completed)
    if (relative) {
      return t('jobsStatus.dailyUpdatedRelative', {
        time: relative,
        defaultValue: `Updated ${relative}`,
      })
    }
    return t('jobsStatus.dailyUpdated', {
      time: formatIstDisplay(completed),
      defaultValue: `Updated daily · last sync ${formatIstDisplay(completed)} IST`,
    })
  }
  if (next) {
    return t('jobsStatus.dailyNext', {
      time: formatIstDisplay(next),
      defaultValue: `Next update ${formatIstDisplay(next)} IST`,
    })
  }
  return t('jobsStatus.dailySchedule', {
    schedule: scheduled,
    defaultValue: `Official listings refresh daily at ${scheduled}`,
  })
}
