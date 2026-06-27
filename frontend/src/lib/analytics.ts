const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim()

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let initialized = false
let scriptLoaded = false
const pendingPageViews: string[] = []

function installGtagStub(): void {
  window.dataLayer = window.dataLayer || []
  // Google expects `arguments`, not a spread array — queued commands must match gtag.js format.
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments)
  }
}

function flushPendingPageViews(): void {
  while (pendingPageViews.length > 0) {
    const path = pendingPageViews.shift()
    if (path) sendPageView(path)
  }
}

function sendPageView(path: string, title?: string): void {
  if (!GA_ID || !window.gtag) return
  const pageTitle = title ?? document.title
  const pageLocation = `${window.location.origin}${path}`
  // Recommended SPA pattern: update config with page_path (sends page_view to GA4).
  window.gtag('config', GA_ID, {
    page_path: path,
    page_title: pageTitle,
    page_location: pageLocation,
  })
  window.gtag('event', 'page_view', {
    send_to: GA_ID,
    page_path: path,
    page_title: pageTitle,
    page_location: pageLocation,
  })
}

/** Load gtag.js once when VITE_GA_MEASUREMENT_ID is set. No-op otherwise. */
export function initAnalytics(): void {
  if (!GA_ID || initialized || typeof window === 'undefined') return
  initialized = true

  installGtagStub()
  window.gtag!('js', new Date())
  window.gtag!('config', GA_ID, {
    send_page_view: false,
    ...(import.meta.env.DEV ? { debug_mode: true } : {}),
  })

  const script = document.createElement('script')
  script.async = true
  if (import.meta.env.VITEST) {
    scriptLoaded = true
    document.head.appendChild(script)
    flushPendingPageViews()
    return
  }
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
  script.onload = () => {
    scriptLoaded = true
    flushPendingPageViews()
  }
  script.onerror = () => {
    if (import.meta.env.DEV) {
      console.warn('[analytics] Failed to load gtag.js')
    }
  }
  document.head.appendChild(script)
}

/** SPA page view — call on route changes after initAnalytics(). */
export function trackPageView(path: string, title?: string): void {
  if (!GA_ID) return
  if (!initialized) initAnalytics()
  if (scriptLoaded && window.gtag) {
    sendPageView(path, title)
    return
  }
  pendingPageViews.push(path)
}

type EventParams = Record<string, string | number | boolean | undefined>

/** Custom GA4 event — no-op when measurement ID is unset. */
export function trackEvent(eventName: string, params?: EventParams): void {
  if (!GA_ID) return
  if (!initialized) initAnalytics()
  if (!window.gtag) return
  const clean: Record<string, string | number | boolean> = {}
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) clean[key] = value
    }
  }
  window.gtag('event', eventName, clean)
}

export function trackProfessionLanding(slug: string, listingCount?: number): void {
  trackEvent('profession_landing', {
    profession_slug: slug,
    listing_count: listingCount ?? 0,
  })
}

export function trackAdmitTableView(source = 'admit-card'): void {
  trackEvent('admit_table_view', { source })
}

export function trackHomepageRowClick(rowType: string): void {
  trackEvent('homepage_row_click', { row_type: rowType })
}

/** Generic in-app click — fires immediately (non-blocking) for GA4 exploration reports. */
export function trackClick(opts: {
  id: string
  href?: string
  source?: string
  label?: string
}): void {
  trackEvent('site_click', {
    click_id: opts.id,
    link_url: opts.href ?? '',
    click_source: opts.source ?? 'page',
    link_text: opts.label ?? opts.id,
  })
}

export function trackNavClick(navItem: string, href: string): void {
  trackClick({ id: navItem, href, source: 'nav', label: navItem })
}

/** Exam landing page view — use in GA4 Explorations: event = exam_landing, breakdown by exam_slug. */
export function trackExamLanding(examSlug: string, listingCount?: number, liveCount?: number): void {
  trackEvent('exam_landing', {
    exam_slug: examSlug,
    listing_count: listingCount ?? 0,
    live_count: liveCount ?? 0,
    content_type: 'exam',
  })
}

/** Exam hub card or related-exam click — GA4: event = exam_click, dimension exam_slug + click_target. */
export function trackExamClick(examSlug: string, target: string, href?: string): void {
  trackEvent('exam_click', {
    exam_slug: examSlug,
    click_target: target,
    link_url: href ?? '',
    content_type: 'exam',
  })
}

/**
 * GA4 dashboard setup (Google Analytics → Explore):
 * 1. Free form → Rows: event name → Values: Event count
 * 2. Filter: event name = site_click → Rows: click_source, click_id → sort desc
 * 3. Filter: event name = exam_landing → Rows: exam_slug → Values: Event count + listing_count avg
 * 4. Funnel: page_view (/explore) → site_click (hub-*) → exam_landing
 * Register exam_slug, click_id, click_source as Custom dimensions (Event scope) in Admin → Custom definitions.
 */
export function getGaMeasurementId(): string {
  return GA_ID
}
