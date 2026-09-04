import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import JobCard from '@/components/jobs/JobCard'
import Footer from '@/components/layout/Footer'
import { pageTitle } from '@/data/siteMeta'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { JobRecord } from '@/types/job'
import {
  BOARDS_INDEX_PATH,
  LATEST_NOTIFICATIONS_PATH,
  ORGANIZATIONS_INDEX_PATH,
  SARKARI_NAUKRI_PATH,
  STATES_INDEX_PATH,
} from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { isJobExpired } from '@/utils/jobFilters'
import { numberLocale } from '@/utils/formatLocale'

const TITLE = 'Sarkari Naukri 2026 — Live Government Jobs'
const LEDE =
  'Official sarkari naukri notifications from verified .gov.in sources — UPSC, SSC, railways, banking, state PSC, and PSU vacancies with apply links.'
const SEO_BODY =
  'Sarkari naukri means government recruitment notified by a commission, board, or department. Live Govt Jobs lists only those official notices: each card links to the recruiting organisation’s website or PDF. We do not collect application fees or host unofficial form mirrors. Use the boards, states, and results hubs when you need exam updates instead of open vacancies.'

type SarkariNaukriPageProps = {
  jobs: JobRecord[]
  jobsLoading?: boolean
  onJobClick?: (job: JobRecord) => void
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function SarkariNaukriPage({
  jobs,
  jobsLoading = false,
  onJobClick,
  onFooterLink,
}: SarkariNaukriPageProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)
  const live = useMemo(() => jobs.filter((job) => !isJobExpired(job)), [jobs])

  useEffect(() => {
    return applyBrowseSeo(SARKARI_NAUKRI_PATH)
  }, [])

  useEffect(() => {
    document.title = pageTitle(TITLE)
  }, [])

  return (
    <div className="static-page browse-landing-page sarkari-naukri-page">
      <header className="exam-landing-page__hero">
        <Link to={LATEST_NOTIFICATIONS_PATH} className="static-page__back">
          {t('nav.latest', { defaultValue: 'Latest notifications' })}
        </Link>
        <div className="exam-landing-page__hero-inner">
          <div className="exam-landing-page__hero-copy">
            <h1 className="exam-landing-page__title">{TITLE}</h1>
            <p className="exam-landing-page__lede">{LEDE}</p>
            <div className="exam-landing-page__stats">
              <span>
                <strong>{jobsLoading ? '…' : live.length.toLocaleString(locale)}</strong>{' '}
                {t('browse.liveJobs', { defaultValue: 'live jobs' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="exam-landing-page__jobs" aria-label={TITLE}>
        {jobsLoading ? (
          <p className="static-page__lede">{t('common.loading', { defaultValue: 'Loading…' })}</p>
        ) : live.length === 0 ? (
          <p className="static-page__lede">
            {t('browse.noJobs', {
              defaultValue: 'No matching live jobs right now. Check back after the next verified update.',
            })}
          </p>
        ) : (
          <div className="job-grid">
            {live.map((job) => (
              <JobCard
                key={job.id || job.slug}
                job={job}
                onClick={onJobClick ? () => onJobClick(job) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <p className="exam-landing-page__seo-body">{SEO_BODY}</p>

      <nav className="sarkari-naukri-page__related" aria-label="Related hubs">
        <Link to="/results">Results</Link>
        <Link to="/results/admit-card">Admit cards</Link>
        <Link to={STATES_INDEX_PATH}>States</Link>
        <Link to={BOARDS_INDEX_PATH}>Boards</Link>
        <Link to={ORGANIZATIONS_INDEX_PATH}>Organisations</Link>
      </nav>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
