import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Footer from '@/components/layout/Footer'
import JobCard from '@/components/jobs/JobCard'
import AdSlot from '@/components/ads/AdSlot'
import { DESIGNATIONS, getDesignationBySlug, jobMatchesDesignation } from '@/data/designations'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { JobRecord } from '@/types/job'

type Props = {
  jobs: JobRecord[]
  jobsLoading?: boolean
  onJobClick: (job: JobRecord) => void
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function DesignationLandingPage({ jobs, jobsLoading, onJobClick, onFooterLink }: Props) {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const def = getDesignationBySlug(slug)

  const matches = useMemo(() => {
    if (!def) return []
    return jobs.filter((j) => jobMatchesDesignation(j as { title?: string; post_name?: string; dept?: string }, def))
  }, [def, jobs])

  if (!def) {
    return (
      <div className="hub-page">
        <h1>{t('designations.notFound', { defaultValue: 'Designation not found' })}</h1>
        <p>
          <Link to="/designations">
            {t('designations.browseAll', { defaultValue: 'Browse all designations' })}
          </Link>
        </p>
        <Footer onFooterLink={onFooterLink} />
      </div>
    )
  }

  return (
    <div className="hub-page">
      <h1>{def.label} — Government Jobs</h1>
      <p className="hub-page__lead">{def.description}</p>

      {jobsLoading ? (
        <p>{t('common.loading', { defaultValue: 'Loading…' })}</p>
      ) : matches.length === 0 ? (
        <p className="bookmarks-page__empty">
          {t('designations.empty', {
            defaultValue: 'No active openings match this designation right now. Check back tomorrow after the daily sync.',
          })}
        </p>
      ) : (
        <div className="job-card-grid">
          {matches.slice(0, 60).map((job, idx) => (
            <JobCard
              key={job.slug || job.id || idx}
              job={job}
              onClick={() => onJobClick(job)}
              enterIndex={idx}
            />
          ))}
        </div>
      )}

      <AdSlot slot="designation-mid" format="horizontal" />

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>
          {t('designations.otherDesignations', { defaultValue: 'Other designations' })}
        </h2>
        <div className="hub-grid">
          {DESIGNATIONS.filter((d) => d.slug !== def.slug).map((d) => (
            <Link key={d.slug} to={`/designation/${d.slug}`} className="hub-card">
              <div className="hub-card__title">{d.label}</div>
              <div className="hub-card__meta">{d.description.slice(0, 80)}…</div>
            </Link>
          ))}
        </div>
      </section>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
