/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOfficialFeed } from '@/hooks/useOfficialFeed'

vi.mock('@/lib/officialFeed', () => ({
  loadOfficialFeed: vi.fn(),
}))

import { loadOfficialFeed } from '@/lib/officialFeed'

describe('useOfficialFeed', () => {
  beforeEach(() => {
    vi.mocked(loadOfficialFeed).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads feed items when enabled', async () => {
    vi.mocked(loadOfficialFeed).mockResolvedValue({
      items: [{ id: 'ssc-1', title: 'SSC notice', link: 'https://ssc.gov.in/notice' }],
      generatedAt: '2026-06-01',
    })

    const { result } = renderHook(() => useOfficialFeed(true))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.generatedAt).toBe('2026-06-01')
  })

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useOfficialFeed(false))
    expect(loadOfficialFeed).not.toHaveBeenCalled()
    expect(result.current.items).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('surfaces fetch errors', async () => {
    vi.mocked(loadOfficialFeed).mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useOfficialFeed(true))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('network down')
  })
})
