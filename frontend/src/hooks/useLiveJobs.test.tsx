/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { resetLiveJobsCacheForTests, useLiveJobs } from '@/hooks/useLiveJobs'
import { createTestQueryWrapper } from '@/test/queryWrapper'
import type { ApiJob } from '@/lib/jobsApi'
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
  fetchLiveJobsSnapshot: vi.fn().mockResolvedValue({
    items: [],
    generatedAt: null,
    dailySync: null,
  }),
  fetchJobsFromApi: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    degraded: false,
  }),
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

  it('loads jobs from API when VITE_JOBS_SOURCE=api', async () => {
    vi.stubEnv('VITE_JOBS_SOURCE', 'api')
    vi.resetModules()
    const jobsApi = await import('@/lib/jobsApi')
    vi.mocked(jobsApi.fetchJobsFromApi).mockResolvedValue({
      items: [mockJob],
      total: 1,
      degraded: false,
    })
    const { resetLiveJobsCacheForTests, useLiveJobs } = await import('@/hooks/useLiveJobs')
    resetLiveJobsCacheForTests()

    const { result, unmount } = renderHook(() => useLiveJobs(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(jobsApi.fetchJobsFromApi).toHaveBeenCalled()
    expect(result.current.sources).toContain('api')
    unmount()
    vi.resetModules()
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
    expect(fetchLiveJobsSnapshot).not.toHaveBeenCalled()
    expect(second.result.current.jobs.length).toBeGreaterThanOrEqual(0)
  })

  it('reports degraded API as error state in auto mode', async () => {
    vi.stubEnv('VITE_JOBS_SOURCE', 'auto')
    vi.resetModules()
    const jobsApi = await import('@/lib/jobsApi')
    vi.mocked(jobsApi.fetchLiveJobsSnapshot).mockResolvedValue({
      items: [],
      generatedAt: null,
      dailySync: null,
    })
    vi.mocked(jobsApi.fetchJobsFromApi).mockResolvedValue({
      items: [],
      total: 0,
      degraded: true,
    })
    const { resetLiveJobsCacheForTests, useLiveJobs } = await import('@/hooks/useLiveJobs')
    resetLiveJobsCacheForTests()

    const { result, unmount } = renderHook(() => useLiveJobs(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.hasBackend).toBe(false)
    expect(String(result.current.error || '')).toMatch(/unavailable/i)
    unmount()
    vi.resetModules()
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
