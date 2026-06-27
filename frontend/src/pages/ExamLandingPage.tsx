import type { CSSProperties } from 'react'
import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import JobCard from '@/components/jobs/JobCard'
import Footer from '@/components/layout/Footer'
import TrackedLink from '@/components/TrackedLink'
import {
  examRoutePath,
  filterJobsForExam,
} from '@/data/exams'
import { getAllExams, isExamSlugValid, resolveExam } from '@/data/examDiscovery'
import { EXAM_CALENDAR_PATH, EXAMS_INDEX_PATH, EXPLORE_HUB_PATH } from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { trackExamClick, trackExamLanding } from '@/lib/analytics'
import { numberLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { JobRecord } from '@/types/job'

type ExamLandingPageProps = {
  jobs: JobRecord[]
  jobsLoading?: boolean
  onJobClick?: (job: JobRecord) => void
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ExamLandingPage({
  jobs,
  jobsLoading = false,
  onJobClick,
  onFooterLink,
}: ExamLandingPageProps) {
  const { examSlug: rawSlug } = useParams<{ examSlug: string }>()
  const examSlug = rawSlug?.toLowerCase() ?? ''
  const exam = useMemo(() => resolveExam(examSlug, jobs), [examSlug, jobs])
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)

  const matched = useMemo(() => (exam ? filterJobsForExam(jobs, exam) : []), [jobs, exam])
  const liveCount = matched.filter((j) => j.status !== 'expired').length
  const vacancyTotal = matched.reduce((s, j) => s + (Number(j.vacancies) || 0), 0)

  const sorted = useMemo(() => {
    return [...matched].sort((a, b) => String(a.lastDate).localeCompare(String(b.lastDate)))
  }, [matched])

  useEffect(() => {
    if (jobsLoading) return
    if (!isExamSlugValid(examSlug, jobs)) {
      navigate(EXAMS_INDEX_PATH, { replace: true })
    }
  }, [examSlug, jobs, jobsLoading, navigate])

  useEffect(() => {
    if (!exam) return undefined
    return applyBrowseSeo(examRoutePath(exam.slug))
  }, [exam])

  useEffect(() => {
    if (!exam) return
    document.title = `${exam.title} | My Govt Jobs`
  }, [exam])

  useEffect(() => {
    if (!exam || jobsLoading) return
    trackExamLanding(exam.slug, matched.length, liveCount)
  }, [exam, jobsLoading, matched.length, liveCount])

  const related = useMemo(
    () => getAllExams(jobs).filter((e) => e.slug !== examSlug).slice(0, 8),
    [jobs, examSlug]
  )

  if (!exam) return null

  const quickLinks = [
    exam.links?.admitCard
      ? { key: 'admit', label: t('nav.admitCard'), href: exam.links.admitCard }
      : null,
    exam.links?.results
      ? { key: 'results', label: t('nav.results'), href: exam.links.results }
      : null,
    exam.links?.syllabus
      ? { key: 'syllabus', label: t('footer.syllabus'), href: exam.links.syllabus }
      : null,
    exam.links?.answerKey
      ? { key: 'answer-key', label: t('footer.answerKeys'), href: exam.links.answerKey }
      : null,
    { key: 'calendar', label: t('footer.examCalendar'), href: EXAM_CALENDAR_PATH },
    { key: 'alerts', label: t('nav.alert'), href: '/alerts' },
  ].filter(Boolean) as { key: string; label: string; href: string }[]

  return (
    <div className="static-page exam-landing-page">
      <header
        className="exam-landing-page__hero"
        style={{ '--exam-accent': exam.accent } as CSSProperties}
      >
        <Link to={EXAMS_INDEX_PATH} className="static-page__back">
          {t('exams.backToIndex', { defaultValue: 'All exams' })}
        </Link>
        <div className="exam-landing-page__hero-inner">
          <span className="exam-landing-page__icon" aria-hidden>
            {exam.icon}
          </span>
          <div className="exam-landing-page__hero-copy">
            {exam.discovered ? (
              <p className="exam-landing-page__discovered-badge">
                {t('exams.discoveredBadge', { defaultValue: 'Auto-generated from live job titles' })}
              </p>
            ) : null}
            <p className="exam-landing-page__board">{exam.board}</p>
            <h1 className="exam-landing-page__title">{exam.title}</h1>
            <p className="exam-landing-page__lede">{exam.seoDescription}</p>
            <div className="exam-landing-page__stats">
              <span>
                <strong>{jobsLoading ? '…' : liveCount.toLocaleString(locale)}</strong>
                {t('exams.statLive', { defaultValue: 'open notifications' })}
              </span>
              <span>
                <strong>{jobsLoading ? '…' : vacancyTotal.toLocaleString(locale)}</strong>
                {t('exams.statVacancies', { defaultValue: 'notified posts' })}
              </span>
            </div>
          </div>
        </div>

        <div className="exam-landing-page__quick-links">
          {quickLinks.map(({ key, label, href }) => (
            <TrackedLink
              key={key}
              to={href}
              trackId={`exam-${exam.slug}-${key}`}
              trackSource="exam-landing"
              trackLabel={`${exam.slug}-${key}`}
              className="exam-landing-page__quick-link"
            >
              {label}
            </TrackedLink>
          ))}
        </div>
      </header>

      <section className="exam-landing-page__jobs" aria-labelledby="exam-jobs-heading">
        <h2 id="exam-jobs-heading" className="exam-landing-page__section-title">
          {t('exams.liveListings', { defaultValue: 'Live official notifications' })}
        </h2>
        {jobsLoading ? (
          <p className="exam-landing-page__loading">{t('jobsStatus.loading', { defaultValue: 'Loading…' })}</p>
        ) : sorted.length === 0 ? (
          <p className="exam-landing-page__empty">
            {t('exams.noListings', {
              defaultValue: 'No matching notifications right now. Check Latest Jobs or subscribe to alerts.',
            })}
          </p>
        ) : (
          <div className="exam-landing-page__job-grid">
            {sorted.map((job) => (
              <JobCard key={job.id ?? job.slug} job={job} onClick={() => onJobClick?.(job)} />
            ))}
          </div>
        )}
      </section>

      <div className="exam-landing-page__body">
        <div className="exam-landing-page__content">
          <p className="exam-landing-page__seo-body">{exam.seoBody}</p>
          {exam.faq?.length ? (
            <div className="exam-landing-page__faq">
              <h2>{t('exams.faqTitle', { defaultValue: 'Frequently asked questions' })}</h2>
              {exam.faq.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary className="faq-item__question">{item.q}</summary>
                  <p className="faq-item__answer">{item.a}</p>
                </details>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="exam-landing-page__sidebar" aria-labelledby="related-exams-heading">
          <h2 id="related-exams-heading" className="exam-landing-page__sidebar-title">
            {t('exams.relatedExams', { defaultValue: 'Other popular exams' })}
          </h2>
          <ul className="exam-landing-page__sidebar-list">
            {related.map((other) => (
              <li key={other.slug}>
                <Link
                  to={examRoutePath(other.slug)}
                  className="exam-landing-page__sidebar-link"
                  onClick={() => trackExamClick(exam.slug, `related-${other.slug}`, examRoutePath(other.slug))}
                >
                  <span aria-hidden>{other.icon}</span> {other.shortTitle}
                </Link>
              </li>
            ))}
          </ul>
          <TrackedLink
            to={EXPLORE_HUB_PATH}
            trackId={`exam-${exam.slug}-explore`}
            trackSource="exam-landing"
            className="exam-landing-page__explore-link"
          >
            {t('explore.backToExplore', { defaultValue: 'Explore all sections →' })}
          </TrackedLink>
        </aside>
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
