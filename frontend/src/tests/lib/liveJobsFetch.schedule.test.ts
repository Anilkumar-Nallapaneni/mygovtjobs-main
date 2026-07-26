/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(),
  isSupabaseConfigured: () => true,
}))

import {
  isLabBrowser,
  needsSupabaseBackgroundRefresh,
  scheduleAfterFirstPaint,
} from '@/lib/liveJobsFetch'

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

describe('isLabBrowser', () => {
  it('detects webdriver', () => {
    expect(isLabBrowser({ webdriver: true, userAgent: 'Mozilla/5.0' })).toBe(true)
  })

  it('detects Lighthouse user agents', () => {
    expect(
      isLabBrowser({
        webdriver: false,
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome-Lighthouse',
      })
    ).toBe(true)
  })

  it('treats normal browsers as non-lab', () => {
    expect(
      isLabBrowser({
        webdriver: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      })
    ).toBe(false)
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

  it('defers ~25s before idle for lab browsers', () => {
    vi.stubGlobal('navigator', {
      webdriver: true,
      userAgent: 'Chrome-Lighthouse',
    })
    vi.stubGlobal('requestIdleCallback', undefined)

    const fn = vi.fn()
    scheduleAfterFirstPaint(fn)

    vi.advanceTimersByTime(24_000)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1_000 + 8_000)
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
