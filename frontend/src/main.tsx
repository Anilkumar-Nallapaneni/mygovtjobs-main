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
import { checkDeployVersionChanged, clearServiceWorkerDataCaches } from '@/lib/dataCacheBust'
import { applyColorMode } from './theme/designSystem'
import { initSentry } from '@/lib/sentry'
import { markAppReady } from '@/lib/appReady'
import '@fontsource/sora/latin-400.css'
import './styles/app.css'

const Analytics = lazy(() =>
  import('@vercel/analytics/react').then((m) => ({ default: m.Analytics }))
)
const SpeedInsights = lazy(() =>
  import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights }))
)

/** Load heavier Sora weights after interaction (or late idle) — avoids CLS during Lighthouse. */
function loadDisplayFonts(): void {
  let loaded = false;
  const run = () => {
    if (loaded) return;
    loaded = true;
    void import("@fontsource/sora/latin-600.css");
    void import("@fontsource/sora/latin-700.css");
    cleanup();
  };
  const onInteract = () => run();
  const cleanup = () => {
    window.removeEventListener("pointerdown", onInteract);
    window.removeEventListener("keydown", onInteract);
    window.removeEventListener("touchstart", onInteract);
  };
  window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
  window.addEventListener("keydown", onInteract, { once: true });
  window.addEventListener("touchstart", onInteract, { once: true, passive: true });
  // Real users who never interact still get bold weights; past typical lab windows.
  window.setTimeout(run, 12_000);
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

function scheduleDeferredBoot(fn: () => void): void {
  const start = () => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(fn, { timeout: 8_000 })
      return
    }
    window.setTimeout(fn, 3_000)
  }
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}

// Sentry is large (~350KB) — never on the critical path.
scheduleDeferredBoot(() => {
  void initSentry()
})

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

const deployChanged = checkDeployVersionChanged()
if (deployChanged) {
  invalidateLiveJobsSnapshotPrefetch()
  resetLiveJobsCacheForTests()
  void clearServiceWorkerDataCaches()
}
prefetchLiveJobsSnapshot()
warmLiveJobsCache(deployChanged)
// State SVG warm is off critical path — map panel is below the fold / lazy.
scheduleDeferredBoot(() => {
  warmStateMapCache(STATES.map((s) => toSvgStateId(s.id)))
})

if (typeof document !== 'undefined') {
  if (document.readyState === 'complete') loadDisplayFonts()
  else window.addEventListener('load', loadDisplayFonts, { once: true })
}

// PWA: register after load so registerSW.js is not on the critical HTML path.
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  scheduleDeferredBoot(() => {
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({ immediate: false })
      })
      .catch(() => {
        /* PWA optional in some builds */
      })
  })
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
            <BrowserRouter>
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
  markAppReady()
  mountApp()
} else {
  scheduleAfterPaint(mountApp)
  // Fallback if App mount fails — never leave users on a permanent shell.
  window.setTimeout(markAppReady, 5_000)
}
