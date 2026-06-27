/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/jobsApi', () => ({
  fetchJobsFromApi: vi.fn(),
}))

const mockJob = {
  id: '1',
  slug: 'ssc-cgl',
  title: 'SSC CGL',
  dept: 'SSC',
  category: 'ssc',
  state_codes: ['dl'],
  vacancies: 100,
  qualification: 'Graduate',
  salary: '',
  age_limit: '',
  last_date: '2030-01-01',
  apply_url: 'https://ssc.gov.in',
  status: 'live',
}

async function loadHook() {
  vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8000')
  vi.resetModules()
  const jobsApi = await import('@/lib/jobsApi')
  const { useServerJobSearch } = await import('./useServerJobSearch')
  return { jobsApi, useServerJobSearch }
}

describe('useServerJobSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('stays inactive when query is too short', async () => {
    const { useServerJobSearch } = await loadHook()
    const { result } = renderHook(() => useServerJobSearch('a'))
    expect(result.current.active).toBe(false)
    expect(result.current.jobs).toBeNull()
  })

  it('stays inactive when API base URL is unset', async () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.resetModules()
    const { useServerJobSearch } = await import('./useServerJobSearch')
    const { result } = renderHook(() => useServerJobSearch('railway jobs'))
    expect(result.current.active).toBe(false)
  })

  it('fetches and adapts jobs after debounce', async () => {
    const { jobsApi, useServerJobSearch } = await loadHook()
    vi.mocked(jobsApi.fetchJobsFromApi).mockResolvedValue({
      items: [mockJob],
      total: 1,
      degraded: false,
    })

    const { result } = renderHook(() =>
      useServerJobSearch('railway', { state: 'dl', category: 'ssc' })
    )

    expect(result.current.active).toBe(true)

    await waitFor(
      () => {
        expect(result.current.jobs).toHaveLength(1)
      },
      { timeout: 2000 }
    )

    expect(jobsApi.fetchJobsFromApi).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'railway', state: 'dl', category: 'ssc', limit: 200 })
    )
    expect(result.current.jobs?.[0].slug).toBe('ssc-cgl')
  })

  it('clears rows when API call fails', async () => {
    const { jobsApi, useServerJobSearch } = await loadHook()
    vi.mocked(jobsApi.fetchJobsFromApi).mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useServerJobSearch('police'))

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      { timeout: 2000 }
    )
    expect(result.current.jobs).toEqual([])
  })
})
