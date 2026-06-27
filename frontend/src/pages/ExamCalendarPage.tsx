import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import TrackedLink from '@/components/TrackedLink'
import {
  EXAM_CALENDAR_PATH,
  EXPLORE_HUB_PATH,
  LATEST_NOTIFICATIONS_PATH,
} from '@/utils/browseRoutes'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { jobDetailPath } from '@/utils/jobRoutes'
import { dateTimeLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { JobRecord } from '@/types/job'

type ExamCalendarPageProps = {
  jobs: JobRecord[]
  jobsLoading?: boolean
  onJobClick?: (job: JobRecord) => void
  onFooterLink?: (target: FooterLinkTarget) => void
}

function parseLastDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function urgencyClass(daysLeft: number): string {
  if (daysLeft < 0) return 'exam-calendar-row--closed'
  if (daysLeft <= 3) return 'exam-calendar-row--urgent'
  if (daysLeft <= 7) return 'exam-calendar-row--soon'
  return ''
}

export default function ExamCalendarPage({
  jobs,
  jobsLoading = false,
  onJobClick,
  onFooterLink,
}: ExamCalendarPageProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = dateTimeLocale(i18n.language)
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const rows = useMemo(() => {
    return jobs
      .map((job) => {
        const last = parseLastDate(job.lastDate)
        if (!last) return null
        const daysLeft = Math.ceil((last.getTime() - today.getTime()) / 86_400_000)
        return { job, last, daysLeft }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => a.last.getTime() - b.last.getTime())
      .slice(0, 120)
  }, [jobs, today])

  useEffect(() => {
    return applyBrowseSeo(EXAM_CALENDAR_PATH)
  }, [])

  useEffect(() => {
    document.title = `${t('examCalendar.title', { defaultValue: 'Government Job Exam Calendar' })} | My Govt Jobs`
  }, [t])

  const handleRowClick = (job: JobRecord) => {
    if (onJobClick) {
      onJobClick(job)
      return
    }
    const path = jobDetailPath(job)
    if (path) window.location.assign(path)
  }

  return (
    <div className="static-page exam-calendar-page">
      <header className="static-page__header">
        <Link to={EXPLORE_HUB_PATH} className="static-page__back">
          {t('explore.backToExplore', { defaultValue: 'Explore' })}
        </Link>
        <h1 className="static-page__title">
          {t('examCalendar.title', { defaultValue: 'Government Job Exam Calendar' })}
        </h1>
        <p className="static-page__lede">
          {t('examCalendar.lede', {
            defaultValue:
              'Application deadlines sorted by last date — plan ahead and never miss an official closing date.',
          })}
        </p>
      </header>

      {jobsLoading ? (
        <p className="exam-calendar-page__loading">{t('jobsStatus.loading', { defaultValue: 'Loading jobs…' })}</p>
      ) : (
        <div className="exam-calendar-page__table-wrap">
          <table className="exam-calendar-table">
            <thead>
              <tr>
                <th scope="col">{t('examCalendar.colJob', { defaultValue: 'Notification' })}</th>
                <th scope="col">{t('examCalendar.colBoard', { defaultValue: 'Board' })}</th>
                <th scope="col">{t('examCalendar.colLastDate', { defaultValue: 'Last date' })}</th>
                <th scope="col">{t('examCalendar.colDaysLeft', { defaultValue: 'Days left' })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ job, last, daysLeft }) => (
                <tr key={job.id ?? job.slug} className={`exam-calendar-row ${urgencyClass(daysLeft)}`}>
                  <td>
                    <button
                      type="button"
                      className="exam-calendar-row__job-btn"
                      onClick={() => handleRowClick(job)}
                      data-track={`exam-cal-${job.slug ?? job.id}`}
                      data-track-source="exam-calendar"
                    >
                      {job.title}
                    </button>
                  </td>
                  <td>{job.dept || job.category?.toUpperCase()}</td>
                  <td>
                    {last.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    {daysLeft < 0
                      ? t('examCalendar.closed', { defaultValue: 'Closed' })
                      : t('examCalendar.daysLeft', { count: daysLeft, defaultValue: '{{count}} days' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="exam-calendar-page__empty">
              {t('examCalendar.empty', { defaultValue: 'No jobs with published last dates right now.' })}
            </p>
          ) : null}
        </div>
      )}

      <div className="exam-calendar-page__cta">
        <TrackedLink
          to={LATEST_NOTIFICATIONS_PATH}
          trackId="exam-cal-latest"
          trackSource="exam-calendar"
          className="exam-calendar-page__cta-link"
        >
          {t('examCalendar.browseLatest', { defaultValue: 'Browse all latest notifications →' })}
        </TrackedLink>
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
