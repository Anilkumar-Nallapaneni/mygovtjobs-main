import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import {
  PROFESSIONS,
  computeProfessionCounts,
  professionRoutePath,
} from '@/data/professions'
import { PROFESSIONS_INDEX_PATH } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { numberLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/useBrowseState'
import type { JobRecord } from '@/types/job'

type ProfessionsIndexPageProps = {
  jobs: JobRecord[]
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ProfessionsIndexPage({ jobs, onFooterLink }: ProfessionsIndexPageProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)
  const counts = useMemo(() => computeProfessionCounts(jobs), [jobs])

  useEffect(() => {
    return applyBrowseSeo(PROFESSIONS_INDEX_PATH)
  }, [])

  useEffect(() => {
    document.title = `${t('profession.indexTitle', { defaultValue: 'Government Jobs by Profession' })} | My Govt Jobs`
  }, [t])

  return (
    <div className="static-page browse-index-page">
      <header className="static-page__header">
        <Link to="/" className="static-page__back">
          {t('jobDetail.back', { defaultValue: 'Back' })}
        </Link>
        <h1 className="static-page__title">
          {t('profession.indexTitle', { defaultValue: 'Government Jobs by Profession' })}
        </h1>
        <p className="static-page__lede">
          {t('profession.indexDesc', {
            defaultValue:
              'Browse live recruitment by profession — medical, engineering, nursing, law, banking, ITI, and more from official .gov.in sources.',
          })}
        </p>
      </header>

      <div className="browse-index-grid">
        {PROFESSIONS.map((prof) => {
          const row = counts[prof.slug] ?? { listings: 0, vacancies: 0 }
          return (
            <Link key={prof.slug} to={professionRoutePath(prof.slug)} className="browse-index-card">
              <h2 className="browse-index-card__title">{t(prof.labelKey)}</h2>
              <p className="browse-index-card__meta">
                {t('qualification.cardMeta', {
                  count: row.listings.toLocaleString(locale),
                  vacancies: row.vacancies.toLocaleString(locale),
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
