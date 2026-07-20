import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchDailySyncMeta,
  fetchSyncStatus,
  type DailySyncMeta,
  type SyncStatusResponse,
} from '@/lib/dailySync'
import {
  fetchLiveJobsCatalog,
  getJobsSourceMode,
  liveJobsQueryKey,
  needsSupabaseBackgroundRefresh,
  refreshSupabaseCatalog,
  scheduleAfterFirstPaint,
  type LiveJobsCatalogResult,
} from '@/lib/liveJobsFetch'
import { queryClient } from '@/lib/queryClient'
import { filterDisplayJobs } from '@/utils/jobFilters'
import { statsFromRows, type CatalogStats } from '@/utils/liveJobsPipeline'

const EMPTY_CATALOG: LiveJobsCatalogResult = {
  rows: [],
  sources: ['static'],
  hasBackend: false,
  error: null,
  dailySync: null,
  rawLength: 0,
}

/** Reset React Query cache between Vitest cases. */
export function resetLiveJobsCacheForTests() {
  queryClient.clear()
}

/** Start catalog load before React mounts (shared with useLiveJobs). */
export function warmLiveJobsCache(bustCache = false) {
  const source = getJobsSourceMode()
  const key = liveJobsQueryKey(source, 0)
  if (queryClient.getQueryData(key) && !bustCache) return
  void queryClient.prefetchQuery({
    queryKey: key,
    queryFn: () =>
      fetchLiveJobsCatalog(bustCache, (partial) => {
        queryClient.setQueryData<LiveJobsCatalogResult>(key, partial)
      }),
  })
}

export function useLiveJobs() {
  const qc = useQueryClient()
  const jobsSource = getJobsSourceMode()
  const [refetchGeneration, setRefetchGeneration] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null)
  const [dailySyncMeta, setDailySyncMeta] = useState<DailySyncMeta | null>(null)

  const dailySyncOnly = import.meta.env.VITE_DAILY_SYNC_ONLY === '1'
  const queryKey = liveJobsQueryKey(jobsSource, refetchGeneration)

  const catalogQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchLiveJobsCatalog(
        refetchGeneration > 0,
        (partial) => {
          qc.setQueryData<LiveJobsCatalogResult>(queryKey, partial)
        },
        dailySyncMeta
      ),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const catalog = catalogQuery.data ?? EMPTY_CATALOG
  const liveRows = catalog.rows
  const sources = catalog.sources
  const hasBackend = catalog.hasBackend
  const error = catalogQuery.isError
    ? (catalogQuery.error as Error)?.message || 'Failed to load live jobs'
    : catalog.error

  useEffect(() => {
    if (catalog.dailySync && !dailySyncMeta) {
      setDailySyncMeta(catalog.dailySync)
    }
  }, [catalog.dailySync, dailySyncMeta])

  useEffect(() => {
    let cancelled = false

    const scheduleMeta = (fn: () => void) => {
      if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(fn, { timeout: 3000 })
        return () => cancelIdleCallback(id)
      }
      const timer = setTimeout(fn, 1500)
      return () => clearTimeout(timer)
    }

    const clearMeta = scheduleMeta(() => {
      Promise.all([fetchSyncStatus(), fetchDailySyncMeta()]).then(([st, meta]) => {
        if (cancelled) return
        if (st) setSyncStatus(st)
        if (meta?.completedAtIst || meta?.completedAt) setDailySyncMeta(meta)
      })
    })

    return () => {
      cancelled = true
      clearMeta()
    }
  }, [])

  // One deferred hydrate per query generation — keep full Supabase pull out of PSI TBT.
  const supabaseRefreshKey = useRef<string | null>(null)
  useEffect(() => {
    if (dailySyncOnly) return undefined
    if (!catalogQuery.isSuccess || !needsSupabaseBackgroundRefresh(catalog, jobsSource)) {
      return undefined
    }

    const gate = `${refetchGeneration}:${jobsSource}`
    if (supabaseRefreshKey.current === gate) return undefined
    supabaseRefreshKey.current = gate

    let cancelled = false
    scheduleAfterFirstPaint(() => {
      if (cancelled) return
      void refreshSupabaseCatalog(dailySyncMeta).then((next) => {
        if (cancelled || !next) return
        qc.setQueryData<LiveJobsCatalogResult>(queryKey, next)
      })
    })

    return () => {
      cancelled = true
    }
  }, [
    catalog,
    catalogQuery.isSuccess,
    dailySyncMeta,
    dailySyncOnly,
    jobsSource,
    qc,
    queryKey,
    refetchGeneration,
  ])

  const refresh = useCallback(() => {
    if (dailySyncOnly) return
    setRefetchGeneration((g) => g + 1)
  }, [dailySyncOnly, setRefetchGeneration])

  const displayJobs = useMemo(() => filterDisplayJobs(liveRows), [liveRows])
  const catalogStats = useMemo<CatalogStats>(() => statsFromRows(displayJobs), [displayJobs])
  const hasCatalog = displayJobs.length > 0
  const refreshing = catalogQuery.isFetching

  return {
    jobs: displayJobs,
    liveRows,
    source: sources.join('+'),
    sources,
    loading: refreshing && !hasCatalog,
    refreshing,
    error,
    liveCount: displayJobs.length,
    catalogStats,
    hasBackend,
    refresh,
    dailySyncMeta,
    syncStatus,
    dailySyncOnly,
  }
}
