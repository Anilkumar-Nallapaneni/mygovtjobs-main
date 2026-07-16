import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import App from './App'
import AnalyticsPageTracker from './components/AnalyticsPageTracker'
import AnalyticsClickTracker from './components/AnalyticsClickTracker'
import ScrollToTop from './components/ScrollToTop'
import ErrorBoundary from './components/ErrorBoundary'
import { QueryProvider } from '@/lib/QueryProvider'
import { prefetchLiveJobsSnapshot, invalidateLiveJobsSnapshotPrefetch } from '@/lib/jobsApi'
import { warmLiveJobsCache, resetLiveJobsCacheForTests } from '@/hooks/useLiveJobs'
import { STATES, toSvgStateId } from '@/data/states'
import { warmStateMapCache } from '@/utils/mapUtils'
import { resolveJobsSourceMode } from '@/utils/liveJobsPipeline'
import { checkDeployVersionChanged, clearServiceWorkerDataCaches } from '@/lib/dataCacheBust'
import { applyColorMode } from './theme/designSystem'
import { initSentry } from '@/lib/sentry'
import '@fontsource/sora/400.css'
import './styles/app.css'

const Analytics = lazy(() =>
  import('@vercel/analytics/react').then((m) => ({ default: m.Analytics }))
)
const SpeedInsights = lazy(() =>
  import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights }))
)

/** Load heavier Sora weights after first paint (mobile TBT). */
function loadDisplayFonts(): void {
  const run = () => {
    void import('@fontsource/sora/600.css')
    void import('@fontsource/sora/700.css')
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 4_000 })
  } else {
    window.setTimeout(run, 2_000)
  }
}

function scheduleAfterPaint(fn: () => void): void {
  const run = () => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(fn, { timeout: 1_200 })
      return
    }
    window.setTimeout(fn, 0)
  }
  // Two rAFs let the static HTML shell paint (LCP) before React hydrate steals the main thread.
  requestAnimationFrame(() => {
    requestAnimationFrame(run)
  })
}

initSentry()

try {
  const key = 'mygovtjobs-color-mode'
  let m = localStorage.getItem(key)
  if (m === 'night') {
    localStorage.setItem(key, 'dark')
    m = 'dark'
  }
  if (m === 'bw') applyColorMode('bw')
  else if (m === 'dark') applyColorMode('dark')
  else applyColorMode('bw')
} catch {
  applyColorMode('bw')
}

const jobsSourceMode = resolveJobsSourceMode(import.meta.env.VITE_JOBS_SOURCE)
const deployChanged = checkDeployVersionChanged()
if (deployChanged) {
  invalidateLiveJobsSnapshotPrefetch()
  resetLiveJobsCacheForTests()
  void clearServiceWorkerDataCaches()
}
if (jobsSourceMode !== 'api') {
  prefetchLiveJobsSnapshot()
}
warmLiveJobsCache(deployChanged || jobsSourceMode === 'static')
warmStateMapCache(STATES.map((s) => toSvgStateId(s.id)))

if (typeof document !== 'undefined') {
  if (document.readyState === 'complete') loadDisplayFonts()
  else window.addEventListener('load', loadDisplayFonts, { once: true })
}

if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

function DeferredInsights() {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    const start = () => {
      if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(() => setReady(true), { timeout: 8_000 })
        return () => cancelIdleCallback(id)
      }
      const timer = window.setTimeout(() => setReady(true), 4_000)
      return () => window.clearTimeout(timer)
    }
    if (document.readyState === 'complete') return start()
    window.addEventListener('load', () => start(), { once: true })
    return undefined
  }, [])
  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <SpeedInsights />
      <Analytics />
    </Suspense>
  )
}

function mountApp(): void {
  const root = document.getElementById('root')
  if (!root) return
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <QueryProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <ScrollToTop />
              <AnalyticsPageTracker />
              <AnalyticsClickTracker />
              <App />
            </BrowserRouter>
          </QueryProvider>
          <DeferredInsights />
        </ErrorBoundary>
      </I18nextProvider>
    </React.StrictMode>
  )
}

// Tests / Vitest need sync mount; production delays hydrate for LCP.
if (import.meta.env.VITEST) {
  mountApp()
} else {
  scheduleAfterPaint(mountApp)
}
