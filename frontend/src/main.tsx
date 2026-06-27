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
import './styles/app.css'

const Analytics = lazy(() =>
  import('@vercel/analytics/react').then((m) => ({ default: m.Analytics }))
)
const SpeedInsights = lazy(() =>
  import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights }))
)

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
warmLiveJobsCache(deployChanged)
warmStateMapCache(STATES.map((s) => toSvgStateId(s.id)))

if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
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
        <Suspense fallback={null}>
          <SpeedInsights />
          <Analytics />
        </Suspense>
      </ErrorBoundary>
    </I18nextProvider>
  </React.StrictMode>
)
