import { useEffect, useMemo, useState } from 'react'
import { fetchJobsFromApi } from '@/lib/jobsApi'
import { adaptLiveJob } from '@/utils/liveJobAdapter'
import { filterDisplayJobs } from '@/utils/jobFilters'
import type { JobRecord } from '@/types/job'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const MIN_QUERY_LEN = 2
const DEBOUNCE_MS = 300

/** Server-side FTS when VITE_API_URL is set and the user submits a search query. */
export function useServerJobSearch(
  query: string,
  filters?: { state?: string | null; category?: string | null }
) {
  const trimmed = query.trim()
  const enabled = Boolean(API_BASE) && trimmed.length >= MIN_QUERY_LEN

  const [rows, setRows] = useState<JobRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setRows([])
      setLoading(false)
      return undefined
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      fetchJobsFromApi({
        q: trimmed,
        state: filters?.state || undefined,
        category: filters?.category || undefined,
        limit: 200,
      })
        .then(({ items }) => {
          if (cancelled) return
          const adapted = items.map((item) => adaptLiveJob(item as Record<string, unknown>))
          setRows(filterDisplayJobs(adapted))
        })
        .catch(() => {
          if (!cancelled) setRows([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled, trimmed, filters?.state, filters?.category])

  return useMemo(
    () => ({
      active: enabled,
      jobs: enabled ? rows : null,
      loading: enabled && loading,
    }),
    [enabled, rows, loading]
  )
}
