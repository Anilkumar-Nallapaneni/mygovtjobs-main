/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNow } from '@/hooks/useNow'

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns current time and refreshes on interval', () => {
    const { result } = renderHook(() => useNow(60_000))
    const initial = result.current
    expect(initial).toBe(Date.now())

    act(() => {
      vi.advanceTimersByTime(60_001)
    })
    expect(result.current).toBeGreaterThan(initial)
  })
})
