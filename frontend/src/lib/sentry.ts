/** Optional Sentry — loads only when VITE_SENTRY_DSN is set. */

export function initSentry(): void {
  const dsn = (import.meta.env.VITE_SENTRY_DSN || '').trim()
  if (!dsn) return

  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      integrations: [Sentry.browserTracingIntegration()],
    })
  })
}
