import { pageTitle } from '@/data/siteMeta'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import AlertSection from '@/components/home/AlertSection'
import Footer from '@/components/layout/Footer'
import TrackedLink from '@/components/TrackedLink'
import { EXPLORE_HUB_PATH, LATEST_NOTIFICATIONS_PATH } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

const ALERTS_PATH = '/alerts'

type AlertsPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function AlertsPage({ onFooterLink }: AlertsPageProps) {
  const { t } = useTranslation()

  useEffect(() => {
    return applyBrowseSeo(ALERTS_PATH)
  }, [])

  useEffect(() => {
    document.title = pageTitle(t('alertsPage.title', { defaultValue: 'Free Government Job Alerts' }));
  }, [t])

  return (
    <div className="static-page alerts-page">
      <header className="static-page__header alerts-page__hero">
        <Link to={EXPLORE_HUB_PATH} className="static-page__back">
          {t('explore.backToExplore', { defaultValue: 'Explore' })}
        </Link>
        <h1 className="static-page__title">
          {t('alertsPage.title', { defaultValue: 'Free Government Job Alerts' })}
        </h1>
        <p className="static-page__lede">
          {t('alertsPage.lede', {
            defaultValue:
              'Get notified when new official recruitment is published — by email, WhatsApp, Telegram, or push notification.',
          })}
        </p>
      </header>

      <div className="alerts-page__form">
        <AlertSection />
      </div>

      <section className="alerts-page__related" aria-labelledby="alerts-related-heading">
        <h2 id="alerts-related-heading" className="alerts-page__related-title">
          {t('alertsPage.relatedTitle', { defaultValue: 'While you wait for alerts' })}
        </h2>
        <div className="alerts-page__related-grid">
          <TrackedLink
            to={LATEST_NOTIFICATIONS_PATH}
            trackId="alerts-latest"
            trackSource="alerts-page"
            className="browse-index-card"
          >
            <h3 className="browse-index-card__title">{t('nav.latest')}</h3>
            <p className="browse-index-card__meta">
              {t('alertsPage.latestDesc', { defaultValue: 'Browse the newest official notifications now.' })}
            </p>
          </TrackedLink>
          <TrackedLink
            to="/guide/how-to-apply"
            trackId="alerts-how-to-apply"
            trackSource="alerts-page"
            className="browse-index-card"
          >
            <h3 className="browse-index-card__title">
              {t('explore.cards.howToApplyTitle', { defaultValue: 'How to apply' })}
            </h3>
            <p className="browse-index-card__meta">
              {t('alertsPage.guideDesc', { defaultValue: 'Step-by-step guide to applying safely online.' })}
            </p>
          </TrackedLink>
        </div>
      </section>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
