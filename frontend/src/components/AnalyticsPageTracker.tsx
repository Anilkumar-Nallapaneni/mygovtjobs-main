import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, trackAdmitTableView, trackEvent, trackPageView } from '@/lib/analytics'

function scheduleAnalytics(fn: () => void): void {
  const start = () => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(fn, { timeout: 6_000 })
      return
    }
    window.setTimeout(fn, 3_000)
  }
  if (document.readyState === 'complete') {
    start()
    return
  }
  window.addEventListener('load', start, { once: true })
}

/** Initializes GA4 after load/idle and sends page_view on client navigations. */
export default function AnalyticsPageTracker() {
  const { pathname, search } = useLocation()
  const [analyticsReady, setAnalyticsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    scheduleAnalytics(() => {
      if (cancelled) return
      initAnalytics()
      setAnalyticsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!analyticsReady) return
    // Search strings may contain personal data. Send route and bounded metadata only.
    trackPageView(pathname)
    const params = new URLSearchParams(search)
    if (params.get('q')) trackEvent('search', { query_length: Math.min(params.get('q')!.length, 100) })
    if (['state', 'category', 'filter'].some(key => params.has(key))) trackEvent('filter_use', { route: pathname })
    if (/^\/jobs\/[^/]+$/.test(pathname)) trackEvent('job_detail_view')
    if (/^\/india\/[^/]+$/.test(pathname)) trackEvent('state_view')
    if (/^\/india\/[^/]+\/district\/[^/]+$/.test(pathname)) trackEvent('district_view')
  }, [analyticsReady, pathname, search])

  useEffect(() => {
    if (!analyticsReady) return
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const link = event.target.closest('a')
      if (!link) return
      if (link.matches('[data-testid="official-apply-link"]')) trackEvent('apply_click')
      else if (link.matches('.job-card__pdf, [data-testid="official-pdf-link"]')) trackEvent('official_notification_click')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [analyticsReady])

  useEffect(() => {
    if (!analyticsReady) return
    if (pathname.startsWith('/results/admit-card')) {
      trackAdmitTableView('admit-card')
    }
  }, [analyticsReady, pathname])

  return null
}
