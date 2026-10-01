import { useEffect, useRef, useState, type CSSProperties } from 'react'

type AdSlotProps = {
  slot: string
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical' | 'fluid'
  responsive?: boolean
  layout?: string
  style?: CSSProperties
  className?: string
}

type ModElement = HTMLElement & { cite: string; dateTime: string }

const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined

/** Named placements used in the UI. Real AdSense unit IDs come from env, not these labels. */
const NAMED_AD_UNITS: Record<string, string | undefined> = {
  'job-detail-mid': import.meta.env.VITE_ADSENSE_SLOT_JOB_DETAIL_MID,
  'results-hub': import.meta.env.VITE_ADSENSE_SLOT_RESULTS_HUB,
  'designation-mid': import.meta.env.VITE_ADSENSE_SLOT_DESIGNATION_MID,
}

export function resolveAdsenseUnit(slot: string): string | null {
  const raw = slot.trim()
  if (/^\d{8,}$/.test(raw)) return raw
  const mapped = String(NAMED_AD_UNITS[raw] || '').trim()
  if (/^\d{8,}$/.test(mapped)) return mapped
  return null
}

let scriptLoaded = false
let scriptLoading: Promise<void> | null = null

function loadAdsenseScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()
  if (scriptLoading) return scriptLoading
  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle"]'
    )
    if (existing) {
      scriptLoaded = true
      resolve()
      return
    }
    const s = document.createElement('script')
    s.async = true
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT_ID!)}`
    s.crossOrigin = 'anonymous'
    s.onload = () => {
      scriptLoaded = true
      resolve()
    }
    s.onerror = () => reject(new Error('adsense-script-failed'))
    document.head.appendChild(s)
  })
  return scriptLoading
}

/**
 * AdSense slot. Renders nothing unless VITE_ADSENSE_CLIENT is set and the placement
 * resolves to a numeric ad-unit id (pass digits, or set VITE_ADSENSE_SLOT_* for the named slots).
 */
export default function AdSlot({
  slot,
  format = 'auto',
  responsive = true,
  layout,
  style,
  className,
}: AdSlotProps) {
  const insRef = useRef<ModElement | null>(null)
  const [ready, setReady] = useState(false)
  const adUnit = resolveAdsenseUnit(slot)

  useEffect(() => {
    if (!CLIENT_ID || !adUnit) return
    let cancelled = false
    loadAdsenseScript()
      .then(() => {
        if (cancelled) return
        setReady(true)
        try {
          const w = window as unknown as { adsbygoogle?: unknown[] }
          w.adsbygoogle = w.adsbygoogle || []
          w.adsbygoogle.push({})
        } catch (err) {
          console.warn('[AdSlot] push failed', err)
        }
      })
      .catch(() => {
        // swallow — no ad shown
      })
    return () => {
      cancelled = true
    }
  }, [adUnit])

  if (!CLIENT_ID || !adUnit) return null

  return (
    <div className={`ad-slot${className ? ` ${className}` : ''}`} style={style} data-adsense={ready ? 'ready' : 'loading'}>
      <span className="ad-slot__label">Advertisement</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={adUnit}
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}
