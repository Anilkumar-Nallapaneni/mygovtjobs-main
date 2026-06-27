/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('analytics', () => {
  beforeEach(() => {
    vi.resetModules()
    document.head.innerHTML = ''
    delete window.dataLayer
    delete window.gtag
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('no-ops when VITE_GA_MEASUREMENT_ID is unset', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '')
    const { initAnalytics, trackPageView, getGaMeasurementId } = await import('./analytics')
    initAnalytics()
    trackPageView('/jobs')
    expect(getGaMeasurementId()).toBe('')
    expect(document.querySelector('script[src*="gtag/js"]')).toBeNull()
  })

  it('loads gtag script and queues page views until script onload', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST12345')
    const { initAnalytics, trackPageView, getGaMeasurementId } = await import('./analytics')

    initAnalytics()
    trackPageView('/?q=1')

    expect(getGaMeasurementId()).toBe('G-TEST12345')
    const script = document.head.querySelector('script')
    expect(script).toBeTruthy()
    expect(window.dataLayer?.length).toBeGreaterThan(0)

    script?.dispatchEvent?.(new Event('load'))
    expect(window.dataLayer?.length).toBeGreaterThan(2)
  })

  it('fires custom events when gtag is ready', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST12345')
    const { initAnalytics, trackProfessionLanding, trackEvent } = await import('./analytics')

    initAnalytics()
    const before = window.dataLayer?.length ?? 0
    trackProfessionLanding('medical', 12)
    trackEvent('test_event', { foo: 'bar' })

    expect((window.dataLayer?.length ?? 0) - before).toBeGreaterThanOrEqual(2)
  })
})
