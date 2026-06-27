import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePwaInstall } from '@/hooks/usePwaInstall'

const SHOW_DELAY_MS = 8000
const SCROLL_THRESHOLD_PX = 280

export default function InstallAppBanner() {
  const { t } = useTranslation()
  const {
    canNativeInstall,
    canIosHint,
    iosHint,
    setIosHint,
    installed,
    promptInstall,
    isDismissed,
    dismissInstall,
  } = usePwaInstall()
  const [visible, setVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const canShow = !installed && (canNativeInstall || canIosHint) && !isDismissed

  useEffect(() => {
    if (!canShow) {
      setVisible(false)
      return undefined
    }

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    if (!isMobile) return undefined

    const onScroll = () => {
      setScrolled(window.scrollY >= SCROLL_THRESHOLD_PX)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [canShow])

  if (!visible && !iosHint) return null
  if (visible && !scrolled && !iosHint) return null

  const handleInstall = async () => {
    await promptInstall()
  }

  const handleDismiss = () => {
    dismissInstall()
    setVisible(false)
    setIosHint(false)
  }

  if (iosHint) {
    return (
      <aside className="install-app-banner" role="dialog" aria-labelledby="install-ios-title">
        <div className="install-app-banner__inner">
          <p id="install-ios-title" className="install-app-banner__title">
            {t('pwa.iosTitle', { defaultValue: 'Add to Home Screen' })}
          </p>
          <p className="install-app-banner__text">
            {t('pwa.iosSteps', {
              defaultValue: 'Tap Share, then "Add to Home Screen" to install My Govt Jobs.',
            })}
          </p>
          <button type="button" className="install-app-banner__dismiss" onClick={handleDismiss}>
            {t('pwa.dismiss', { defaultValue: 'Got it' })}
          </button>
        </div>
      </aside>
    )
  }

  if (!visible) return null

  return (
    <aside className="install-app-banner" role="dialog" aria-labelledby="install-banner-title">
      <div className="install-app-banner__inner">
        <div className="install-app-banner__body">
          <p id="install-banner-title" className="install-app-banner__title">
            {t('pwa.bannerTitle', { defaultValue: 'Install My Govt Jobs' })}
          </p>
          <p className="install-app-banner__text">
            {t('pwa.bannerBody', {
              defaultValue: 'Get faster access and offline browsing from your home screen.',
            })}
          </p>
        </div>
        <div className="install-app-banner__actions">
          <button type="button" className="install-app-banner__cta" onClick={handleInstall}>
            {t('pwa.install', { defaultValue: 'Install app' })}
          </button>
          <button type="button" className="install-app-banner__dismiss" onClick={handleDismiss}>
            {t('pwa.dismiss', { defaultValue: 'Not now' })}
          </button>
        </div>
      </div>
    </aside>
  )
}
