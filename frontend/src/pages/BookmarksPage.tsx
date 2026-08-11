import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useBookmarks } from '@/hooks/useBookmarks'
import JobCard from '@/components/jobs/JobCard'
import Footer from '@/components/layout/Footer'
import PageFallback from '@/components/PageFallback'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { JobRecord } from '@/types/job'

type BookmarksPageProps = {
  jobs: JobRecord[]
  jobsLoading: boolean
  onJobClick: (job: JobRecord) => void
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function BookmarksPage({ jobs, jobsLoading, onJobClick, onFooterLink }: BookmarksPageProps) {
  const { t } = useTranslation()
  const { configured, loading: authLoading, user } = useAuth()
  const { bookmarks, loading: bookmarksLoading } = useBookmarks()

  const savedJobs = useMemo(() => {
    if (!bookmarks.length || !jobs.length) return [] as JobRecord[]
    const bySlug = new Map<string, JobRecord>()
    for (const j of jobs) if (j.slug) bySlug.set(j.slug, j)
    const byId = new Map<string, JobRecord>()
    for (const j of jobs) if (j.id) byId.set(String(j.id), j)
    const results: JobRecord[] = []
    for (const b of bookmarks) {
      const match = (b.job_slug && bySlug.get(b.job_slug)) || byId.get(b.job_id)
      if (match) results.push(match)
    }
    return results
  }, [bookmarks, jobs])

  if (!configured) {
    return (
      <div className="static-page">
        <h1>{t('bookmarks.title', { defaultValue: 'Saved jobs' })}</h1>
        <p>
          {t('bookmarks.notConfigured', {
            defaultValue: 'Saved-jobs sync is unavailable. Sign-in is required.',
          })}
        </p>
        <Footer onFooterLink={onFooterLink} />
      </div>
    )
  }

  if (authLoading) return <PageFallback className="page-fallback" />

  if (!user) {
    return (
      <div className="static-page">
        <h1>{t('bookmarks.title', { defaultValue: 'Saved jobs' })}</h1>
        <p>
          {t('bookmarks.signInRequired', {
            defaultValue: 'Please sign in to view your saved jobs.',
          })}{' '}
          <Link to="/account">{t('account.signIn', { defaultValue: 'Sign in' })}</Link>
        </p>
        <Footer onFooterLink={onFooterLink} />
      </div>
    )
  }

  return (
    <div className="static-page bookmarks-page">
      <h1>{t('bookmarks.title', { defaultValue: 'Saved jobs' })}</h1>
      <p className="bookmarks-page__lead">
        {t('bookmarks.lead', {
          defaultValue: 'Jobs you have saved. Deadlines auto-expire when the recruitment closes.',
        })}
      </p>

      {(bookmarksLoading || jobsLoading) && <PageFallback className="page-fallback" />}

      {!bookmarksLoading && !jobsLoading && bookmarks.length === 0 && (
        <p className="bookmarks-page__empty">
          {t('bookmarks.empty', { defaultValue: 'No saved jobs yet. Tap the star on any job card to save it.' })}
        </p>
      )}

      {savedJobs.length > 0 && (
        <div className="job-card-grid">
          {savedJobs.map((job, idx) => (
            <JobCard
              key={job.slug || job.id || idx}
              job={job}
              onClick={() => onJobClick(job)}
              enterIndex={idx}
            />
          ))}
        </div>
      )}

      {!jobsLoading && bookmarks.length > 0 && savedJobs.length === 0 && (
        <p className="bookmarks-page__empty">
          {t('bookmarks.expired', {
            defaultValue: 'Your saved jobs are no longer live. They may have closed or been removed.',
          })}
        </p>
      )}

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
