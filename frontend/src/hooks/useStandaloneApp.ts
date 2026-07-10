import { useEffect } from 'react'

/** Marks `<html data-standalone>` when running as installed PWA or Play Store TWA. */
export function useStandaloneApp() {
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const iosStandalone = Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone
    )
    const apply = () => {
      const standalone = mq.matches || iosStandalone
      document.documentElement.toggleAttribute('data-standalone', standalone)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
}
