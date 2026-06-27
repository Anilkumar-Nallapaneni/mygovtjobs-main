/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOfficialArchive } from './useOfficialArchive'

describe('useOfficialArchive', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          generatedAt: '2026-06-01',
          items: [{ title: 'Admit card' }],
        }),
      } as Response),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clears data when topic is null', () => {
    const { result } = renderHook(() => useOfficialArchive(null))
    expect(result.current.items).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('loads archive json for a topic', async () => {
    const { result } = renderHook(() => useOfficialArchive('results'))

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(fetch).toHaveBeenCalledWith('/data/official-archives/results.json', { cache: 'default' })
    expect(result.current.generatedAt).toBe('2026-06-01')
  })
})
