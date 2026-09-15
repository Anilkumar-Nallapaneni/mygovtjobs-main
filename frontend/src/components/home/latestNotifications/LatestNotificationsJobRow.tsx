import { formatJobDate } from '@/utils/formatJobDate'
import type { NotificationRow } from '@/utils/latestNotificationsTable'

export const LATEST_NOTIF_COL_COUNT = 8

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string

export function formatLatestNotifDate(value: string | null | undefined, _locale?: string) {
  return formatJobDate(value)
}

export function formatLatestNotifVacancies(value: number | null | undefined, locale: string) {
  if (!value || value <= 0) return '—'
  return value.toLocaleString(locale)
}

export function groupMetaLine(
  group: { count: number; vacancyTotal: number },
  t: TranslateFn
) {
  const jobs = t('latestNotif.stateJobs', {
    count: group.count,
    defaultValue: '{{count}} jobs',
  })
  const vac =
    group.vacancyTotal > 0
      ? ` · ${t('latestNotif.stateVacancies', {
          count: group.vacancyTotal,
          defaultValue: '{{count}} vacancies',
        })}`
      : ''
  return `${jobs}${vac}`
}

export function LatestNotificationsTableHead({ t }: { t: TranslateFn }) {
  return (
    <thead>
      <tr>
        <th>{t('latestNotif.colPostDate', { defaultValue: 'Post Date' })}</th>
        <th>{t('latestNotif.colBoard', { defaultValue: 'Recruitment Board' })}</th>
        <th>{t('latestNotif.colPost', { defaultValue: 'Exam / Post Name' })}</th>
        <th>{t('latestNotif.colVacancies', { defaultValue: 'Vacancies' })}</th>
        <th>{t('latestNotif.colQual', { defaultValue: 'Qualification' })}</th>
        <th>{t('latestNotif.colAdvt', { defaultValue: 'Advt No' })}</th>
        <th>{t('latestNotif.colLastDate', { defaultValue: 'Last Date' })}</th>
        <th>{t('latestNotif.colMore', { defaultValue: 'More Information' })}</th>
      </tr>
    </thead>
  )
}

export function LatestNotificationsJobRow({
  row,
  locale,
  onRowClick,
  t,
}: {
  row: NotificationRow
  locale: string
  onRowClick: (row: NotificationRow) => void
  t: TranslateFn
}) {
  return (
    <tr
      className="latest-notif__job-row"
      onClick={() => onRowClick(row)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onRowClick(row)
        }
      }}
      tabIndex={0}
    >
      <td>{formatLatestNotifDate(row.postDateIso || row.postDate, locale)}</td>
      <td className="latest-notif__board">{row.board}</td>
      <td className="latest-notif__post">{row.postName}</td>
      <td className="latest-notif__vacancy">{formatLatestNotifVacancies(row.vacancies, locale)}</td>
      <td>{row.qualification || '—'}</td>
      <td>{row.advtNo || '—'}</td>
      <td>{formatLatestNotifDate(row.lastDateIso || row.lastDate, locale)}</td>
      <td>
        {row.detailUrl ? (
          <a
            className="latest-notif__link"
            href={row.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {t('latestNotif.getDetails', { defaultValue: 'Get Details' })}
          </a>
        ) : (
          <span className="latest-notif__link" style={{ cursor: 'pointer' }}>
            {t('latestNotif.view', { defaultValue: 'View' })}
          </span>
        )}
      </td>
    </tr>
  )
}

export function LatestNotificationsMajorSectionHeader({
  label,
  meta,
  variant,
}: {
  label: string
  meta: string
  variant: string
}) {
  return (
    <tr className={`latest-notif__major-row latest-notif__major-row--${variant}`}>
      <td colSpan={LATEST_NOTIF_COL_COUNT}>
        <div className="latest-notif__major-head">
          <span className="latest-notif__major-label">{label}</span>
          <span className="latest-notif__major-meta">{meta}</span>
        </div>
      </td>
    </tr>
  )
}

export function LatestNotificationsSubSectionHeader({
  label,
  meta,
  variant,
}: {
  label: string
  meta: string
  variant: string
}) {
  return (
    <tr className={`latest-notif__sub-row latest-notif__sub-row--${variant}`}>
      <td colSpan={LATEST_NOTIF_COL_COUNT}>
        <div className="latest-notif__sub-head">
          <span className="latest-notif__sub-label">{label}</span>
          <span className="latest-notif__sub-meta">{meta}</span>
        </div>
      </td>
    </tr>
  )
}
