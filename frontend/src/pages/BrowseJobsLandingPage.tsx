import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import JobCard from '@/components/jobs/JobCard'
import Footer from '@/components/layout/Footer'
import NotFoundPage from '@/pages/NotFoundPage'
import { CATS, type CategoryId } from '@/data/categories'
import { getOrgBySlug } from '@/data/orgIndex'
import { getProfessionBySlug } from '@/data/professions'
import { getQualificationBySlug } from '@/data/qualifications'
import { STATES } from '@/data/states'
import { pageTitle } from '@/data/siteMeta'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { JobRecord } from '@/types/job'
import {
  CATEGORIES_INDEX_PATH,
  ORGANIZATIONS_INDEX_PATH,
  PROFESSIONS_INDEX_PATH,
  QUALIFICATIONS_INDEX_PATH,
  STATES_INDEX_PATH,
  isValidCategoryId,
} from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { filterHomePageJobs } from '@/utils/homePageFilters'
import { numberLocale } from '@/utils/formatLocale'
import { isJobExpired } from '@/utils/jobFilters'

export type BrowseLandingKind = 'state' | 'category' | 'profession' | 'qualification' | 'org'

type BrowseJobsLandingPageProps = {
  kind: BrowseLandingKind
  jobs: JobRecord[]
  jobsLoading?: boolean
  onJobClick?: (job: JobRecord) => void
  onFooterLink?: (target: FooterLinkTarget) => void
}

type ResolvedLanding = {
  valid: boolean
  path: string
  indexPath: string
  backLabel: string
  title: string
  description: string
  filter: Parameters<typeof filterHomePageJobs>[0]
}

function resolveLanding(
  kind: BrowseLandingKind,
  params: Record<string, string | undefined>,
  jobs: JobRecord[]
): ResolvedLanding {
  if (kind === 'state') {
    const stateId = (params.stateId || '').toLowerCase()
    const state = STATES.find((s) => s.id === stateId)
    return {
      valid: Boolean(state),
      path: `/state/${stateId}`,
      indexPath: STATES_INDEX_PATH,
      backLabel: 'All states',
      title: state ? `${state.n} Government Jobs 2026` : '',
      description: state
        ? `Verified government job notifications for ${state.n}. Official sources only.`
        : '',
      filter: { jobs, selectedState: stateId },
    }
  }

  if (kind === 'category') {
    const categoryId = (params.categoryId || '').toLowerCase()
    const cat = isValidCategoryId(categoryId)
      ? CATS.find((c) => c.id === categoryId)
      : undefined
    return {
      valid: Boolean(cat),
      path: `/category/${categoryId}`,
      indexPath: CATEGORIES_INDEX_PATH,
      backLabel: 'All categories',
      title: cat ? `${cat.name} Government Jobs 2026` : '',
      description: cat
        ? `Live ${cat.name} recruitment notifications from official government sources.`
        : '',
      filter: { jobs, activeCat: categoryId as CategoryId },
    }
  }

  if (kind === 'profession') {
    const slug = (params.slug || '').toLowerCase()
    const profession = getProfessionBySlug(slug)
    return {
      valid: Boolean(profession),
      path: `/profession/${slug}`,
      indexPath: PROFESSIONS_INDEX_PATH,
      backLabel: 'All professions',
      title: profession ? `${profession.title} Government Jobs` : '',
      description: profession?.seoDescription || '',
      filter: { jobs, professionSlug: slug },
    }
  }

  if (kind === 'qualification') {
    const slug = (params.slug || '').toLowerCase()
    const qualification = getQualificationBySlug(slug)
    return {
      valid: Boolean(qualification),
      path: `/qualification/${slug}`,
      indexPath: QUALIFICATIONS_INDEX_PATH,
      backLabel: 'All qualifications',
      title: qualification?.title || '',
      description: qualification?.seoDescription || '',
      filter: { jobs, qualificationSlug: slug },
    }
  }

  const slug = (params.slug || '').toLowerCase()
  const org = getOrgBySlug(slug)
  return {
    valid: Boolean(org),
    path: `/org/${slug}`,
    indexPath: ORGANIZATIONS_INDEX_PATH,
    backLabel: 'All organisations',
    title: org ? `${org.dept} Recruitment 2026` : '',
    description: org
      ? `Live recruitment notifications from ${org.dept}. Official apply links and PDF notifications only.`
      : '',
    filter: { jobs, orgSlug: slug, orgDept: org?.dept ?? null },
  }
}

export default function BrowseJobsLandingPage({
  kind,
  jobs,
  jobsLoading = false,
  onJobClick,
  onFooterLink,
}: BrowseJobsLandingPageProps) {
  const params = useParams()
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)

  const landing = useMemo(() => resolveLanding(kind, params, jobs), [kind, params, jobs])

  const matched = useMemo(
    () => (landing.valid ? filterHomePageJobs(landing.filter) : []),
    [landing]
  )
  const liveCount = matched.filter((j) => !isJobExpired(j)).length

  useEffect(() => {
    if (!landing.valid) return undefined
    return applyBrowseSeo(landing.path)
  }, [landing])

  useEffect(() => {
    if (!landing.valid) return
    document.title = pageTitle(landing.title)
  }, [landing])

  if (!landing.valid) {
    return <NotFoundPage onFooterLink={onFooterLink} />
  }

  return (
    <div className="static-page browse-landing-page">
      <header className="exam-landing-page__hero">
        <Link to={landing.indexPath} className="static-page__back">
          {t('browse.backToIndex', { defaultValue: landing.backLabel })}
        </Link>
        <div className="exam-landing-page__hero-inner">
          <div className="exam-landing-page__hero-copy">
            <h1 className="exam-landing-page__title">{landing.title}</h1>
            <p className="exam-landing-page__lede">{landing.description}</p>
            <div className="exam-landing-page__stats">
              <span>
                <strong>{jobsLoading ? '…' : liveCount.toLocaleString(locale)}</strong>{' '}
                {t('browse.liveJobs', { defaultValue: 'live jobs' })}
              </span>
              <span>
                <strong>{jobsLoading ? '…' : matched.length.toLocaleString(locale)}</strong>{' '}
                {t('browse.listings', { defaultValue: 'listings' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="exam-landing-page__jobs" aria-label={landing.title}>
        {jobsLoading ? (
          <p className="static-page__lede">{t('common.loading', { defaultValue: 'Loading…' })}</p>
        ) : matched.length === 0 ? (
          <p className="static-page__lede">
            {t('browse.noJobs', {
              defaultValue: 'No matching live jobs right now. Check back after the next verified update.',
            })}
          </p>
        ) : (
          <div className="job-grid">
            {matched.map((job) => (
              <JobCard
                key={job.id || job.slug}
                job={job}
                onClick={onJobClick ? () => onJobClick(job) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
