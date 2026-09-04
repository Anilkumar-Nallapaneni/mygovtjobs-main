import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveHtmlApplyHref } from '@/utils/jobDetailLinks'
import {
  sortNotificationRows,
  type LatestTableSortKey,
  type NotificationRow,
} from '@/utils/latestNotificationsTable'
import { formatJobDate } from '@/utils/formatJobDate'

type LatestJobsSimpleTableProps = {
  rows: NotificationRow[]
  sort: LatestTableSortKey
  onSortChange: (sort: LatestTableSortKey) => void
  onRowClick: (row: NotificationRow) => void
}

function formatDisplayDate(value: string | null | undefined, _locale?: string) {
  return formatJobDate(value)
}

export default function LatestJobsSimpleTable({
  rows,
  sort,
  onSortChange,
  onRowClick,
}: LatestJobsSimpleTableProps) {
  const { t } = useTranslation()

  const sortedRows = useMemo(() => sortNotificationRows(rows, sort), [rows, sort])

  return (
    <div className="latest-notif__simple">
      <div className="latest-notif__toolbar">
        <span className="latest-notif__sort-label">
          {t('latestNotif.sortBy', { defaultValue: 'Sort by' })}
        </span>
        <div className="latest-notif__sort-toggle" role="group" aria-label={t('latestNotif.sortBy')}>
          {(['newest', 'expiringSoon'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`latest-notif__sort-btn${sort === key ? ' latest-notif__sort-btn--active' : ''}`}
              aria-pressed={sort === key}
              onClick={() => onSortChange(key)}
            >
              {key === 'newest'
                ? t('latestNotif.sortNewest', { defaultValue: 'Newest' })
                : t('latestNotif.sortExpiring', { defaultValue: 'Expiring soon' })}
            </button>
          ))}
        </div>
      </div>

      <div className="latest-notif__wrap">
        <table className="latest-notif__table latest-notif__table--simple">
          <thead>
            <tr>
              <th>{t('latestNotif.colBoard', { defaultValue: 'Organization' })}</th>
              <th>{t('latestNotif.colPost', { defaultValue: 'Post' })}</th>
              <th>{t('latestNotif.colQual', { defaultValue: 'Education' })}</th>
              <th>{t('latestNotif.colLastDate', { defaultValue: 'Last date' })}</th>
              <th>{t('latestNotif.colApply', { defaultValue: 'Apply' })}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const applyHref = row._job ? resolveHtmlApplyHref(row._job) : null
              return (
                <tr
                  key={row.id}
                  className="latest-notif__job-row latest-notif__job-row--simple"
                  onClick={() => onRowClick(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onRowClick(row)
                    }
                  }}
                  tabIndex={0}
                >
                  <td className="latest-notif__board">{row.board}</td>
                  <td className="latest-notif__post">{row.postName}</td>
                  <td>{row.qualification || '—'}</td>
                  <td>{formatDisplayDate(row.lastDateIso || row.lastDate)}</td>
                  <td>
                    {applyHref ? (
                      <a
                        className="latest-notif__apply-link"
                        href={applyHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('latestNotif.apply', { defaultValue: 'Apply' })}
                      </a>
                    ) : (
                      <span className="latest-notif__apply-muted">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
