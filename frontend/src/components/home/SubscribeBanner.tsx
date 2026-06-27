import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'mygovtjobs-subscribe-dismissed'
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000
const SHOW_DELAY_MS = 8000

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (!Number.isFinite(ts)) return false
    return Date.now() - ts < DISMISS_MS
  } catch {
    return false
  }
}

function dismissBanner(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

export default function SubscribeBanner() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)

  const allowedPath = pathname === '/' || pathname === '/jobs'

  useEffect(() => {
    if (!allowedPath || isDismissed()) {
      setVisible(false)
      return undefined
    }

    const timer = window.setTimeout(() => {
      if (!isDismissed()) setVisible(true)
    }, SHOW_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [allowedPath, pathname])

  if (!visible) return null

  const handleDismiss = () => {
    dismissBanner()
    setVisible(false)
  }

  return (
    <aside className="subscribe-banner" role="dialog" aria-labelledby="subscribe-banner-title">
      <div className="subscribe-banner__inner">
        <div className="subscribe-banner__body">
          <p id="subscribe-banner-title" className="subscribe-banner__title">
            {t('subscribeBanner.title')}
          </p>
          <p className="subscribe-banner__text">{t('subscribeBanner.body')}</p>
        </div>
        <div className="subscribe-banner__actions">
          <Link to="/alerts" className="subscribe-banner__cta" onClick={handleDismiss}>
            {t('subscribeBanner.cta')}
          </Link>
          <button type="button" className="subscribe-banner__dismiss" onClick={handleDismiss}>
            {t('subscribeBanner.dismiss')}
          </button>
        </div>
      </div>
    </aside>
  )
}
