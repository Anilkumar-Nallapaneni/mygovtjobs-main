import { useEffect, useRef } from 'react'
import { isTurnstileConfigured, loadTurnstileScript, turnstileSiteKey } from '@/lib/turnstile'

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void
  className?: string
}

/** Renders Cloudflare Turnstile when VITE_TURNSTILE_SITE_KEY is set; otherwise nothing. */
export default function TurnstileWidget({ onToken, className }: TurnstileWidgetProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!isTurnstileConfigured()) {
      onTokenRef.current(null)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        await loadTurnstileScript()
        if (cancelled || !hostRef.current || !window.turnstile) return
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
        widgetIdRef.current = window.turnstile.render(hostRef.current, {
          sitekey: turnstileSiteKey(),
          theme: 'auto',
          size: 'flexible',
          callback: (token) => onTokenRef.current(token),
          'error-callback': () => onTokenRef.current(null),
          'expired-callback': () => onTokenRef.current(null),
        })
      } catch {
        onTokenRef.current(null)
      }
    })()

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null
      }
    }
  }, [])

  if (!isTurnstileConfigured()) return null

  return <div ref={hostRef} className={className ?? 'turnstile-widget'} />
}
