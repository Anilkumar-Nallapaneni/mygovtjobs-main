/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOfficialArchivesBatch } from './useOfficialArchivesBatch'

describe('useOfficialArchivesBatch', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const topic = String(url).split('/').pop()?.replace('.json', '')
        return {
          ok: true,
          json: async () => ({ items: [{ title: topic }] }),
        } as Response
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns empty map for no topics', () => {
    const { result } = renderHook(() => useOfficialArchivesBatch([]))
    expect(result.current).toEqual({})
    expect(fetch).not.toHaveBeenCalled()
  })

  it('loads multiple topics in parallel', async () => {
    const { result } = renderHook(() => useOfficialArchivesBatch(['results', 'admit-cards']))

    await waitFor(() => expect(Object.keys(result.current)).toHaveLength(2))
    expect(result.current.results?.[0]?.title).toBe('results')
    expect(result.current['admit-cards']?.[0]?.title).toBe('admit-cards')
  })
})
