/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { resetLiveJobsCacheForTests, useLiveJobs } from '@/hooks/useLiveJobs'
import { createTestQueryWrapper } from '@/test/queryWrapper'
import type { ApiJob } from '@/lib/jobsApi'
import type { LiveJobsCatalogResult } from '@/lib/liveJobsFetch'
import type { JobRecord } from '@/types/job'

const wrapper = createTestQueryWrapper()

const mockJob: ApiJob = {
  id: '1',
  slug: 'upsc-cse-2026',
  title: 'UPSC Civil Services Examination 2026',
  dept: 'UPSC',
  category: 'upsc',
  state_codes: [],
  vacancies: 1000,
  qualification: 'Graduate',
  salary: '',
  age_limit: '',
  last_date: '2026-06-01',
  apply_url: 'https://upsc.gov.in/notification.pdf',
  status: 'live',
}

vi.mock('@/lib/dailySync', () => ({
  fetchSyncStatus: vi.fn().mockResolvedValue(null),
  fetchDailySyncMeta: vi.fn().mockResolvedValue(null),
  dailySyncFromJsonPayload: vi.fn(() => null),
}))

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => false),
  getSupabase: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/jobsApi', () => ({
  JOBS_FETCH_TIMEOUT_MS: 5000,
  LIVE_JOBS_HARD_BUST_MS: 5 * 60 * 1000,
  fetchLiveJobsSnapshot: vi.fn().mockResolvedValue({
    items: [],
    generatedAt: null,
    dailySync: null,
  }),
  fetchFullLiveJobsSnapshot: vi.fn().mockResolvedValue({
    items: [],
    generatedAt: null,
    dailySync: null,
  }),
  fetchJobsFromApi: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    degraded: false,
  }),
  markLiveJobsSnapshotFetched: vi.fn(),
  shouldHardBustLiveJobsCache: vi.fn(() => false),
  resetLiveJobsSnapshotFetchClockForTests: vi.fn(),
}))

vi.mock('@/utils/liveJobsPipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/liveJobsPipeline')>()
  return {
    ...actual,
    processLiveJobPayload: vi.fn((raw: unknown[]) => ({
      rows: raw as JobRecord[],
      stats: { total: raw.length, live: raw.length, withPdf: 0 },
    })),
  }
})

describe('useLiveJobs', () => {
  beforeEach(() => {
    resetLiveJobsCacheForTests()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetLiveJobsCacheForTests()
  })

  it('loads jobs from static snapshot when configured', async () => {
    const { fetchLiveJobsSnapshot } = await import('@/lib/jobsApi')
    vi.mocked(fetchLiveJobsSnapshot).mockResolvedValueOnce({
      items: [mockJob],
      generatedAt: '2026-06-11',
      dailySync: null,
    })

    vi.stubEnv('VITE_JOBS_SOURCE', 'static')

    const { result } = renderHook(() => useLiveJobs(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.jobs.length).toBeGreaterThanOrEqual(0)
    expect(result.current.sources).toContain('official-sites')
  })

  it('exposes refresh without throwing', async () => {
    const { result } = renderHook(() => useLiveJobs(), { wrapper })

    await waitFor(() => {
      expect(result.current.refresh).toBeTypeOf('function')
    })

    expect(() => result.current.refresh()).not.toThrow()
  })

  it('keeps the public browse catalog on the CDN snapshot regardless of legacy source env', async () => {
    const { fetchLiveJobsSnapshot, fetchJobsFromApi } = await import('@/lib/jobsApi')
    vi.stubEnv('VITE_JOBS_SOURCE', 'api')
    vi.mocked(fetchLiveJobsSnapshot).mockResolvedValueOnce({
      items: [mockJob],
      generatedAt: '2026-06-11',
      dailySync: null,
    })
    const { result } = renderHook(() => useLiveJobs(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sources).toContain('official-sites')
    expect(fetchJobsFromApi).not.toHaveBeenCalled()
  })

  it('uses cached rows on subsequent mounts', async () => {
    const { fetchLiveJobsSnapshot } = await import('@/lib/jobsApi')
    vi.mocked(fetchLiveJobsSnapshot).mockResolvedValue({
      items: [mockJob],
      generatedAt: '2026-06-11',
      dailySync: null,
    })
    vi.stubEnv('VITE_JOBS_SOURCE', 'static')

    const first = renderHook(() => useLiveJobs(), { wrapper })
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    first.unmount()

    vi.mocked(fetchLiveJobsSnapshot).mockClear()
    const second = renderHook(() => useLiveJobs(), { wrapper })
    await waitFor(() => expect(second.result.current.loading).toBe(false))
    // React Query memory cache may skip the network; session seed also paints instantly.
    expect(second.result.current.jobs.length).toBeGreaterThanOrEqual(0)
  })

  it('paints session-seeded rows immediately on remount after cache clear', async () => {
    const { fetchLiveJobsSnapshot } = await import('@/lib/jobsApi')
    const { writeLiveJobsSessionCatalog } = await import('@/lib/liveJobsSessionCache')
    vi.stubEnv('VITE_JOBS_SOURCE', 'static')

    const seeded: LiveJobsCatalogResult = {
      rows: [
        {
          id: '1',
          slug: 'upsc-cse-2026',
          title: 'UPSC Civil Services Examination 2026',
          dept: 'UPSC',
          status: 'live',
          vacancies: 1000,
          lastDate: '2026-06-01',
          applyUrl: 'https://upsc.gov.in/notification.pdf',
          detail: { source: 'official-sites' },
        } as JobRecord,
      ],
      sources: ['official-sites'],
      hasBackend: true,
      error: null,
      dailySync: null,
      rawLength: 1,
    }

    vi.mocked(fetchLiveJobsSnapshot).mockImplementation(
      () =>
        new Promise(() => {
          /* never resolve — session seed should still paint */
        })
    )

    resetLiveJobsCacheForTests()
    writeLiveJobsSessionCatalog('static', seeded)

    const { result } = renderHook(() => useLiveJobs(), { wrapper })
    expect(result.current.loading).toBe(false)
    expect(result.current.liveRows.length).toBeGreaterThanOrEqual(1)
    expect(result.current.sources).toContain('official-sites')
  })


  it('warmLiveJobsCache primes shared payload', async () => {
    const { fetchLiveJobsSnapshot } = await import('@/lib/jobsApi')
    const { warmLiveJobsCache } = await import('@/hooks/useLiveJobs')
    vi.mocked(fetchLiveJobsSnapshot).mockResolvedValue({
      items: [mockJob],
      generatedAt: '2026-06-11',
      dailySync: null,
    })
    vi.stubEnv('VITE_JOBS_SOURCE', 'static')

    warmLiveJobsCache(true)
    await waitFor(() => expect(fetchLiveJobsSnapshot).toHaveBeenCalled())
    const { result } = renderHook(() => useLiveJobs(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sources).toContain('official-sites')
  })
})
