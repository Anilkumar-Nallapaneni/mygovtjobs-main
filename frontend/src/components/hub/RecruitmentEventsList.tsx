import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useRecruitmentEventsByType } from '@/hooks/useRecruitmentEvents'
import type { RecruitmentEventType } from '@/lib/recruitmentEventsApi'
import PageFallback from '@/components/PageFallback'

type Props = {
  eventType: RecruitmentEventType
  title: string
  emptyMessage?: string
  limit?: number
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  try {
    const date = new Date(d)
    if (Number.isNaN(date.getTime())) return d
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

export default function RecruitmentEventsList({ eventType, title, emptyMessage, limit = 100 }: Props) {
  const { t } = useTranslation()
  const { rows, loading } = useRecruitmentEventsByType(eventType, limit)

  if (loading) return <PageFallback className="page-fallback" />

  if (!rows.length) {
    return (
      <p className="bookmarks-page__empty">
        {emptyMessage || t('events.empty', { defaultValue: 'No entries yet.' })}
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="exam-events-table" aria-label={title}>
        <thead>
          <tr>
            <th>{t('events.organization', { defaultValue: 'Organization' })}</th>
            <th>{t('events.exam', { defaultValue: 'Exam / Notification' })}</th>
            <th>{t('events.date', { defaultValue: 'Date' })}</th>
            <th>{t('events.link', { defaultValue: 'Link' })}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const primaryEvent = r.events[0]
            return (
              <tr key={r.id}>
                <td>{r.organization}</td>
                <td>
                  {r.primary_job_id ? (
                    <Link to={`/jobs/${encodeURIComponent(r.canonical_slug)}`}>{primaryEvent?.title || r.title}</Link>
                  ) : (
                    primaryEvent?.title || r.title
                  )}
                </td>
                <td>{formatDate(primaryEvent?.event_date ?? null)}</td>
                <td>
                  {primaryEvent?.document_url ? (
                    <a href={primaryEvent.document_url} target="_blank" rel="noopener noreferrer">
                      {t('events.download', { defaultValue: 'Download' })}
                    </a>
                  ) : primaryEvent?.official_url ? (
                    <a href={primaryEvent.official_url} target="_blank" rel="noopener noreferrer">
                      {t('events.viewOfficial', { defaultValue: 'View official' })}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
