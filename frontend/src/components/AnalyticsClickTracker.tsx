import { useEffect } from 'react'
import { trackClick } from '@/lib/analytics'

/** Delegated click listener for elements with data-track — catches footer/social clicks without wrapping every link. */
export default function AnalyticsClickTracker() {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const el = target.closest('[data-track]')
      if (!el || el.hasAttribute('data-track-handled')) return
      const id = el.getAttribute('data-track')
      if (!id) return
      const href =
        el.getAttribute('href') ||
        el.getAttribute('data-href') ||
        (el instanceof HTMLAnchorElement ? el.pathname : '') ||
        ''
      trackClick({
        id,
        href,
        source: el.getAttribute('data-track-source') || 'delegated',
        label: el.getAttribute('data-track-label') || el.textContent?.trim()?.slice(0, 80) || id,
      })
    }

    document.addEventListener('click', handler, { capture: true, passive: true })
    return () => document.removeEventListener('click', handler, { capture: true })
  }, [])

  return null
}
