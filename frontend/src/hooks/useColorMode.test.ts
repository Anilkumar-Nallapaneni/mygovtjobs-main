/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useColorMode } from './useColorMode'

vi.mock('@/theme/designSystem', () => ({
  applyColorMode: vi.fn(),
}))

import { applyColorMode } from '@/theme/designSystem'

describe('useColorMode', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(applyColorMode).mockClear()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark') ? false : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it('defaults to bw when storage is empty and system prefers light', () => {
    const { result } = renderHook(() => useColorMode())
    expect(result.current.colorMode).toBe('bw')
    expect(applyColorMode).toHaveBeenCalledWith('bw')
  })

  it('uses dark when storage is empty and system prefers dark', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
    const { result } = renderHook(() => useColorMode())
    expect(result.current.colorMode).toBe('dark')
  })

  it('migrates legacy night mode to dark', () => {
    localStorage.setItem('mygovtjobs-color-mode', 'night')
    const { result } = renderHook(() => useColorMode())
    expect(result.current.colorMode).toBe('dark')
    expect(localStorage.getItem('mygovtjobs-color-mode')).toBe('dark')
  })

  it('persists user selection', () => {
    const { result } = renderHook(() => useColorMode())
    act(() => result.current.onColorModeChange('dark'))
    expect(result.current.colorMode).toBe('dark')
    expect(localStorage.getItem('mygovtjobs-color-mode')).toBe('dark')
    expect(applyColorMode).toHaveBeenCalledWith('dark')
  })
})
