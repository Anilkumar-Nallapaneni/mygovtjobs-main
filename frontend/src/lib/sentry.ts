/** Optional Sentry — loads only when VITE_SENTRY_DSN is set. Never on critical path. */

export function initSentry(): void {
  const dsn = (import.meta.env.VITE_SENTRY_DSN || '').trim()
  if (!dsn) return

  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      // Keep tracing light — homepage TBT is the PageSpeed bottleneck.
      tracesSampleRate: 0.02,
      integrations: [Sentry.browserTracingIntegration()],
    })
  })
}
