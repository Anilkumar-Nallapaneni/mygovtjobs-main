import { appDeployVersion } from '@/lib/dataCacheBust'
import type { LiveJobsCatalogResult } from '@/lib/liveJobsFetch'
import type { JobsSourceMode } from '@/utils/liveJobsPipeline'

const STORAGE_PREFIX = 'mygovtjobs-live-catalog'

/** Cap session payload so we stay under typical 5 MB sessionStorage quotas. */
const MAX_SESSION_ROWS = 4000
const MAX_SESSION_CHARS = 4_500_000

type SessionCatalogPayload = {
  v: string
  source: JobsSourceMode
  savedAt: number
  catalog: LiveJobsCatalogResult
}

function storageKey(source: JobsSourceMode): string {
  return `${STORAGE_PREFIX}:${source}:${appDeployVersion()}`
}

function trimCatalogForSession(catalog: LiveJobsCatalogResult): LiveJobsCatalogResult {
  if (catalog.rows.length <= MAX_SESSION_ROWS) return catalog
  return {
    ...catalog,
    rows: catalog.rows.slice(0, MAX_SESSION_ROWS),
    rawLength: Math.min(catalog.rawLength, MAX_SESSION_ROWS),
  }
}

/** Read last successful catalog for this deploy + jobs source (F5 instant paint). */
export function readLiveJobsSessionCatalog(
  source: JobsSourceMode
): LiveJobsCatalogResult | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(source))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionCatalogPayload
    if (!parsed || parsed.v !== appDeployVersion() || parsed.source !== source) return null
    if (!parsed.catalog || !Array.isArray(parsed.catalog.rows)) return null
    if (!parsed.catalog.rows.length) return null
    return parsed.catalog
  } catch {
    return null
  }
}

/** Persist catalog after a successful fetch. Best-effort; ignores quota errors. */
export function writeLiveJobsSessionCatalog(
  source: JobsSourceMode,
  catalog: LiveJobsCatalogResult
): void {
  if (typeof sessionStorage === 'undefined') return
  if (!catalog.rows.length) return

  const trimmed = trimCatalogForSession(catalog)
  const payload: SessionCatalogPayload = {
    v: appDeployVersion(),
    source,
    savedAt: Date.now(),
    catalog: trimmed,
  }

  try {
    const json = JSON.stringify(payload)
    if (json.length > MAX_SESSION_CHARS) {
      // Fall back to a smaller seed so refresh still paints something instantly.
      payload.catalog = {
        ...trimmed,
        rows: trimmed.rows.slice(0, 200),
        rawLength: Math.min(trimmed.rawLength, 200),
      }
      sessionStorage.setItem(storageKey(source), JSON.stringify(payload))
      return
    }
    sessionStorage.setItem(storageKey(source), json)
  } catch {
    try {
      const small: SessionCatalogPayload = {
        v: appDeployVersion(),
        source,
        savedAt: Date.now(),
        catalog: {
          ...trimmed,
          rows: trimmed.rows.slice(0, 80),
          rawLength: Math.min(trimmed.rawLength, 80),
        },
      }
      sessionStorage.setItem(storageKey(source), JSON.stringify(small))
    } catch {
      /* private mode / quota */
    }
  }
}

/** Clear session catalog (tests / deploy cache clear). */
export function clearLiveJobsSessionCatalog(source?: JobsSourceMode): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    if (source) {
      sessionStorage.removeItem(storageKey(source))
      return
    }
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key)
    }
    for (const key of keys) sessionStorage.removeItem(key)
  } catch {
    /* private mode */
  }
}
