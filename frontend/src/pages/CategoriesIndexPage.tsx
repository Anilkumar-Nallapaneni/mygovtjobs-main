import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import TrackedLink from '@/components/TrackedLink'
import { CATS } from '@/data/categories'
import { computeJobAggregates } from '@/utils/jobAggregates'
import { CATEGORIES_INDEX_PATH, EXPLORE_HUB_PATH } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { numberLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { JobRecord } from '@/types/job'

type CategoriesIndexPageProps = {
  jobs: JobRecord[]
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function CategoriesIndexPage({ jobs, onFooterLink }: CategoriesIndexPageProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)
  const { categoryCounts } = computeJobAggregates(jobs)

  useEffect(() => {
    return applyBrowseSeo(CATEGORIES_INDEX_PATH)
  }, [])

  useEffect(() => {
    document.title = `${t('categories.indexTitle', { defaultValue: 'Government Jobs by Category' })} | My Govt Jobs`
  }, [t])

  const sorted = [...CATS].sort((a, b) => (categoryCounts[b.id] ?? 0) - (categoryCounts[a.id] ?? 0))

  return (
    <div className="static-page browse-index-page">
      <header className="static-page__header">
        <Link to={EXPLORE_HUB_PATH} className="static-page__back">
          {t('explore.backToExplore', { defaultValue: 'Explore' })}
        </Link>
        <h1 className="static-page__title">
          {t('categories.indexTitle', { defaultValue: 'Government Jobs by Category' })}
        </h1>
        <p className="static-page__lede">
          {t('categories.indexDesc', {
            defaultValue:
              'UPSC, SSC, Railways, Banking, Defence, Police, Teaching, PSU, Health, and State PSC — official board-wise listings.',
          })}
        </p>
      </header>

      <div className="browse-index-grid">
        {sorted.map((cat) => {
          const count = categoryCounts[cat.id] ?? 0
          return (
            <TrackedLink
              key={cat.id}
              to={`/category/${cat.id}`}
              trackId={`category-${cat.id}`}
              trackSource="categories-index"
              trackLabel={cat.name}
              className="browse-index-card browse-index-card--category"
              style={{ '--browse-card-accent': cat.color } as CSSProperties}
            >
              <span className="browse-index-card__icon" aria-hidden>
                {cat.icon}
              </span>
              <h2 className="browse-index-card__title">{t(`category.${cat.id}`, { defaultValue: cat.name })}</h2>
              <p className="browse-index-card__meta">
                {t('categories.cardMeta', {
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
