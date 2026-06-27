import { useTranslation } from 'react-i18next'

import TrackedLink from '@/components/TrackedLink'
import { EXPLORE_HUB_PATH } from '@/utils/browseRoutes'

/** Prominent CTA on the home page — drives users to the full explore hub (separate pages + analytics). */
export default function ExploreHubBanner() {
  const { t } = useTranslation()

  return (
    <section className="explore-hub-banner" aria-labelledby="explore-hub-banner-title">
      <div className="explore-hub-banner__inner">
        <div className="explore-hub-banner__copy">
          <p className="explore-hub-banner__eyebrow">
            {t('explore.bannerEyebrow', { defaultValue: 'New — explore every section' })}
          </p>
          <h2 id="explore-hub-banner-title" className="explore-hub-banner__title">
            {t('explore.bannerTitle', { defaultValue: 'Jobs, results, alerts & guides — each on its own page' })}
          </h2>
          <p className="explore-hub-banner__text">
            {t('explore.bannerText', {
              defaultValue:
                'Browse by state, category, qualification, exam calendar, how-to-apply guides, and more. Stay longer, find exactly what you need.',
            })}
          </p>
        </div>
        <TrackedLink to={EXPLORE_HUB_PATH} trackId="home-explore-banner" trackSource="home" className="explore-hub-banner__btn">
          {t('explore.bannerCta', { defaultValue: 'Open explore hub →' })}
        </TrackedLink>
      </div>
    </section>
  )
}
