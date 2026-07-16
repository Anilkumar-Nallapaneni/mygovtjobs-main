import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, trackAdmitTableView, trackPageView } from '@/lib/analytics'

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
    trackPageView(`${pathname}${search}`)
  }, [analyticsReady, pathname, search])

  useEffect(() => {
    if (!analyticsReady) return
    if (pathname.startsWith('/results/admit-card')) {
      trackAdmitTableView('admit-card')
    }
  }, [analyticsReady, pathname])

  return null
}
