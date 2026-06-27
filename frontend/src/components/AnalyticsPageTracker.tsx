import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, trackAdmitTableView, trackPageView } from '@/lib/analytics'

/** Initializes GA4 (if configured) and sends page_view on client navigations. */
export default function AnalyticsPageTracker() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    initAnalytics()
    trackPageView(`${pathname}${search}`)
  }, [pathname, search])

  useEffect(() => {
    if (pathname.startsWith('/results/admit-card')) {
      trackAdmitTableView('admit-card')
    }
  }, [pathname])

  return null
}
