import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import HubCard from '@/components/hub/HubCard'
import TrackedLink from '@/components/TrackedLink'
import { EXAMS, examRoutePath } from '@/data/exams'
import { computeAllExamCounts, discoverExamsFromJobs } from '@/data/examDiscovery'
import { EXAMS_INDEX_PATH, EXPLORE_HUB_PATH } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { numberLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { JobRecord } from '@/types/job'

type ExamsIndexPageProps = {
  jobs: JobRecord[]
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ExamsIndexPage({ jobs, onFooterLink }: ExamsIndexPageProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)
  const counts = useMemo(() => computeAllExamCounts(jobs), [jobs])
  const discovered = useMemo(() => discoverExamsFromJobs(jobs), [jobs])

  const sortedCurated = useMemo(
    () => [...EXAMS].sort((a, b) => (counts[b.slug]?.live ?? 0) - (counts[a.slug]?.live ?? 0)),
    [counts]
  )

  const sortedDiscovered = useMemo(
    () => [...discovered].sort((a, b) => (counts[b.slug]?.live ?? 0) - (counts[a.slug]?.live ?? 0)),
    [discovered, counts]
  )

  useEffect(() => {
    return applyBrowseSeo(EXAMS_INDEX_PATH)
  }, [])

  useEffect(() => {
    document.title = `${t('exams.indexTitle', { defaultValue: 'Popular Government Exams' })} | My Govt Jobs`
  }, [t])

  return (
    <div className="static-page browse-index-page exams-index-page">
      <header className="static-page__header">
        <Link to={EXPLORE_HUB_PATH} className="static-page__back">
          {t('explore.backToExplore', { defaultValue: 'Explore' })}
        </Link>
        <h1 className="static-page__title">
          {t('exams.indexTitle', { defaultValue: 'Popular Government Exams 2026' })}
        </h1>
        <p className="static-page__lede">
          {t('exams.indexDesc', {
            defaultValue:
              'Dedicated pages for SSC CGL, UPSC CSE, IBPS PO, RRB NTPC, CTET, CAPF, AFCAT, State PSC, and more — plus auto-detected exams from live notifications.',
          })}
        </p>
      </header>

      <h2 className="exams-index-page__section-label">
        {t('exams.curatedSection', { defaultValue: 'Popular exams' })}
      </h2>
      <div className="exams-index-page__grid">
        {sortedCurated.map((exam) => {
          const row = counts[exam.slug] ?? { listings: 0, vacancies: 0, live: 0 }
          return (
            <HubCard
              key={exam.slug}
              id={`exam-hub-${exam.slug}`}
              href={examRoutePath(exam.slug)}
              icon={exam.icon}
              title={exam.shortTitle}
              description={exam.seoDescription.slice(0, 120) + (exam.seoDescription.length > 120 ? '…' : '')}
              stat={t('exams.cardMeta', {
                live: row.live.toLocaleString(locale),
                vacancies: row.vacancies.toLocaleString(locale),
                defaultValue: '{{live}} open · {{vacancies}} posts',
              })}
              accent={exam.accent}
            />
          )
        })}
      </div>

      {sortedDiscovered.length > 0 ? (
        <>
          <h2 className="exams-index-page__section-label exams-index-page__section-label--discovered">
            {t('exams.discoveredSection', {
              defaultValue: 'Detected from live job titles',
            })}
          </h2>
          <p className="exams-index-page__discovered-note">
            {t('exams.discoveredNote', {
              defaultValue:
                'These pages are built automatically when 2+ official notifications match the same exam name in our database.',
            })}
          </p>
          <div className="exams-index-page__grid exams-index-page__grid--discovered">
            {sortedDiscovered.map((exam) => {
              const row = counts[exam.slug] ?? { listings: 0, vacancies: 0, live: 0 }
              return (
                <HubCard
                  key={exam.slug}
                  id={`exam-discovered-${exam.slug}`}
                  href={examRoutePath(exam.slug)}
                  icon={exam.icon}
                  title={exam.shortTitle}
                  description={exam.seoDescription.slice(0, 100) + '…'}
                  stat={t('exams.cardMeta', {
                    live: row.live.toLocaleString(locale),
                    vacancies: row.vacancies.toLocaleString(locale),
                    defaultValue: '{{live}} open · {{vacancies}} posts',
                  })}
                  accent={exam.accent}
                />
              )
            })}
          </div>
        </>
      ) : null}

      <div className="exams-index-page__cta">
        <TrackedLink to="/guide/exam-preparation" trackId="exams-prep-guide" trackSource="exams-index" className="exams-index-page__cta-link">
          {t('explore.cards.examPrepTitle', { defaultValue: 'Exam preparation tips' })}
        </TrackedLink>
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
