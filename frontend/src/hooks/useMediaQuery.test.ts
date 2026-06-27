/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery'

describe('useMediaQuery', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(min-width: 768px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('reflects the current media query match', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(result.current).toBe(true)
  })

  it('updates when the query match changes', () => {
    const media = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    vi.mocked(window.matchMedia).mockImplementation(() => media as MediaQueryList)

    const { result } = renderHook(() => useMediaQuery('(prefers-reduced-motion: reduce)'))
    expect(result.current).toBe(false)

    media.matches = true
    const changeHandler = vi.mocked(media.addEventListener).mock.calls[0]?.[1] as () => void
    act(() => changeHandler())
    expect(result.current).toBe(true)
  })
})
