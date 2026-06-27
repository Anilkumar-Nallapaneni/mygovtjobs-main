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
  })

  it('defaults to bw when storage is empty', () => {
    const { result } = renderHook(() => useColorMode())
    expect(result.current.colorMode).toBe('bw')
    expect(applyColorMode).toHaveBeenCalledWith('bw')
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
