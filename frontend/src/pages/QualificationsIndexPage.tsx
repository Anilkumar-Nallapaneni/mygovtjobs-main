import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import { QUALIFICATIONS } from '@/data/qualifications'
import { computeEducationVacancySummary } from '@/utils/educationVacancySummary'
import { qualificationRoutePath } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { numberLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/useBrowseState'
import type { JobRecord } from '@/types/job'

const INDEX_PATH = '/qualifications'

type QualificationsIndexPageProps = {
  jobs: JobRecord[]
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function QualificationsIndexPage({ jobs, onFooterLink }: QualificationsIndexPageProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)
  const summary = computeEducationVacancySummary(jobs)
  const summaryByBucket = new Map(summary.map((row) => [row.id, row]))

  useEffect(() => {
    return applyBrowseSeo(INDEX_PATH)
  }, [])

  useEffect(() => {
    document.title = `${t('qualification.indexTitle')} | My Govt Jobs`
  }, [t])

  return (
    <div className="static-page browse-index-page">
      <header className="static-page__header">
        <Link to="/" className="static-page__back">
          {t('jobDetail.back', { defaultValue: 'Back' })}
        </Link>
        <h1 className="static-page__title">{t('qualification.indexTitle')}</h1>
        <p className="static-page__lede">{t('qualification.indexDesc')}</p>
      </header>

      <div className="browse-index-grid">
        {QUALIFICATIONS.map((qual) => {
          const row = qual.bucketId ? summaryByBucket.get(qual.bucketId) : null
          const count = row?.listings ?? 0
          const vacancies = row?.vacancies ?? 0
          return (
            <Link key={qual.slug} to={qualificationRoutePath(qual.slug)} className="browse-index-card">
              <h2 className="browse-index-card__title">{qual.title.replace(' 2026', '')}</h2>
              <p className="browse-index-card__meta">
                {t('qualification.cardMeta', {
                  count: count.toLocaleString(locale),
                  vacancies: vacancies.toLocaleString(locale),
                  defaultValue: '{{count}} jobs · {{vacancies}} posts',
                })}
              </p>
            </Link>
          )
        })}
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
