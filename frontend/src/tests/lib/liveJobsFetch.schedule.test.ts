/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(),
  isSupabaseConfigured: () => true,
}))

import { needsSupabaseBackgroundRefresh, scheduleAfterFirstPaint } from '@/lib/liveJobsFetch'

describe('needsSupabaseBackgroundRefresh', () => {
  it('refreshes a large static snapshot when Supabase is explicitly selected', () => {
    vi.stubEnv('VITE_DAILY_SYNC_ONLY', '0')
    const shouldRefresh = needsSupabaseBackgroundRefresh(
      {
        rows: [],
        sources: ['official-sites'],
        hasBackend: true,
        error: null,
        dailySync: null,
        rawLength: 2_696,
      },
      'supabase'
    )
    vi.unstubAllEnvs()
    expect(shouldRefresh).toBe(true)
  })
})

describe('scheduleAfterFirstPaint', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('runs within ~2s for real users after load', () => {
    vi.stubGlobal('navigator', {
      webdriver: false,
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
    })
    // Avoid requestIdleCallback so we exercise the short setTimeout path.
    vi.stubGlobal('requestIdleCallback', undefined)

    const fn = vi.fn()
    scheduleAfterFirstPaint(fn)

    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1_500)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not special-case automated browsers', () => {
    vi.stubGlobal('navigator', {
      webdriver: true,
      userAgent: 'Chrome-Lighthouse',
    })
    vi.stubGlobal('requestIdleCallback', undefined)

    const fn = vi.fn()
    scheduleAfterFirstPaint(fn)

    vi.advanceTimersByTime(1_500)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('runs immediately on user interaction', () => {
    vi.stubGlobal('navigator', {
      webdriver: true,
      userAgent: 'Chrome-Lighthouse',
    })
    vi.stubGlobal('requestIdleCallback', undefined)

    const fn = vi.fn()
    scheduleAfterFirstPaint(fn)

    window.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
