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
 * AdSense slot. Renders nothing (returns null) unless VITE_ADSENSE_CLIENT is set.
 * Requires AdSense approval + a matching ad-slot ID from your AdSense dashboard.
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

  useEffect(() => {
    if (!CLIENT_ID) return
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
  }, [])

  if (!CLIENT_ID) return null

  return (
    <div className={`ad-slot${className ? ` ${className}` : ''}`} style={style} data-adsense={ready ? 'ready' : 'loading'}>
      <span className="ad-slot__label">Advertisement</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}
