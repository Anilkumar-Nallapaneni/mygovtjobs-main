import { pageTitle } from '@/data/siteMeta'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import HubCard from '@/components/hub/HubCard'
import TrackedLink from '@/components/TrackedLink'
import { HUB_SECTIONS } from '@/data/hubSections'
import { EXPLORE_HUB_PATH } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { numberLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

type ExploreHubPageProps = {
  liveCount?: number
  orgCount?: number
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ExploreHubPage({ liveCount = 0, orgCount = 0, onFooterLink }: ExploreHubPageProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)

  useEffect(() => {
    return applyBrowseSeo(EXPLORE_HUB_PATH)
  }, [])

  useEffect(() => {
    document.title = pageTitle(t('explore.title', { defaultValue: 'Explore Live Govt Jobs' }));
  }, [t])

  return (
    <div className="static-page explore-hub-page">
      <header className="explore-hub-page__hero">
        <TrackedLink to="/" trackId="explore-back" trackSource="hub" className="static-page__back">
          {t('jobDetail.back', { defaultValue: 'Back' })}
        </TrackedLink>
        <div className="explore-hub-page__hero-inner">
          <p className="explore-hub-page__eyebrow">
            {t('explore.eyebrow', { defaultValue: 'Everything in one place' })}
          </p>
          <h1 className="explore-hub-page__title">
            {t('explore.title', { defaultValue: 'Explore Live Govt Jobs' })}
          </h1>
          <p className="explore-hub-page__lede">
            {t('explore.lede', {
              defaultValue:
                'Browse jobs by state, board, qualification, and profession. Track exam results, admit cards, and deadlines — every section has its own page.',
            })}
          </p>
          <div className="explore-hub-page__stats" aria-label={t('explore.statsLabel', { defaultValue: 'Live stats' })}>
            <span className="explore-hub-page__stat">
              <strong>{liveCount.toLocaleString(locale)}</strong>
              {t('explore.statJobs', { defaultValue: 'live jobs' })}
            </span>
            <span className="explore-hub-page__stat">
              <strong>{orgCount.toLocaleString(locale)}</strong>
              {t('explore.statOrgs', { defaultValue: 'official orgs' })}
            </span>
            <span className="explore-hub-page__stat">
              <strong>36</strong>
              {t('explore.statStates', { defaultValue: 'states & UTs' })}
            </span>
          </div>
        </div>
      </header>

      {HUB_SECTIONS.map((section) => (
        <section key={section.id} className="explore-hub-page__section" aria-labelledby={`hub-${section.id}`}>
          <h2 id={`hub-${section.id}`} className="explore-hub-page__section-title">
            {t(section.titleKey, { defaultValue: section.titleDefault })}
          </h2>
          <div className="explore-hub-page__grid">
            {section.cards.map((card) => (
              <HubCard
                key={card.id}
                id={card.id}
                href={card.href}
                icon={card.icon}
                title={t(card.titleKey, { defaultValue: card.titleDefault })}
                description={t(card.descKey, { defaultValue: card.descDefault })}
                accent={card.accent}
              />
            ))}
          </div>
        </section>
      ))}

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
