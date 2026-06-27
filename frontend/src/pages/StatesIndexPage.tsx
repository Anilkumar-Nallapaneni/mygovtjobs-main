import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import TrackedLink from '@/components/TrackedLink'
import { STATES } from '@/data/states'
import { computeJobAggregates } from '@/utils/jobAggregates'
import { EXPLORE_HUB_PATH, STATES_INDEX_PATH } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { numberLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { JobRecord } from '@/types/job'

type StatesIndexPageProps = {
  jobs: JobRecord[]
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function StatesIndexPage({ jobs, onFooterLink }: StatesIndexPageProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)
  const { stateCounts } = computeJobAggregates(jobs)

  useEffect(() => {
    return applyBrowseSeo(STATES_INDEX_PATH)
  }, [])

  useEffect(() => {
    document.title = `${t('states.indexTitle', { defaultValue: 'Government Jobs by State' })} | My Govt Jobs`
  }, [t])

  const sorted = [...STATES].sort((a, b) => (stateCounts[b.id] ?? 0) - (stateCounts[a.id] ?? 0))

  return (
    <div className="static-page browse-index-page">
      <header className="static-page__header">
        <Link to={EXPLORE_HUB_PATH} className="static-page__back">
          {t('explore.backToExplore', { defaultValue: 'Explore' })}
        </Link>
        <h1 className="static-page__title">
          {t('states.indexTitle', { defaultValue: 'Government Jobs by State & UT' })}
        </h1>
        <p className="static-page__lede">
          {t('states.indexDesc', {
            defaultValue:
              'Browse live recruitment from every state and union territory — official PSC and department notifications only.',
          })}
        </p>
      </header>

      <div className="browse-index-grid">
        {sorted.map((state) => {
          const count = stateCounts[state.id] ?? 0
          return (
            <TrackedLink
              key={state.id}
              to={`/state/${state.id}`}
              trackId={`state-${state.id}`}
              trackSource="states-index"
              trackLabel={state.n}
              className="browse-index-card browse-index-card--state"
            >
              <h2 className="browse-index-card__title">{state.n}</h2>
              <p className="browse-index-card__meta">
                {t('states.cardMeta', {
                  count: count.toLocaleString(locale),
                  defaultValue: '{{count}} live notifications',
                })}
              </p>
            </TrackedLink>
          )
        })}
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
