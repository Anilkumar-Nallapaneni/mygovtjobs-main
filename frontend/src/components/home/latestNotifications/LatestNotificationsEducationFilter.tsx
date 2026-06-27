import EducationFilterPill from '@/components/home/EducationFilterPill'
import { QUICK_FILTER_KEYS } from '@/utils/educationVacancySummary'

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string

export function LatestNotificationsEducationFilter({
  counts,
  activeFilter,
  locale,
  onSelect,
  t,
}: {
  counts: Record<string, { listings: number; vacancies: number }>
  activeFilter: string | null
  locale: string
  onSelect: (filterKey: string | null) => void
  t: TranslateFn
}) {
  return (
    <div className="latest-notif__edu-filter">
      <span className="latest-notif__edu-filter-label">
        {t('latestNotif.browseEducation', { defaultValue: 'Browse by education' })}
      </span>
      <div className="latest-notif__edu-filter-pills" role="tablist">
        {QUICK_FILTER_KEYS.map((key) => {
          const meta = counts[key] ?? { listings: 0, vacancies: 0 }
          if (!meta.listings) return null
          return (
            <EducationFilterPill
              key={key}
              filterKey={key}
              active={activeFilter === key}
              counts={meta}
              locale={locale}
              compact
              t={t}
              onClick={() => onSelect(activeFilter === key ? null : key)}
            />
          )
        })}
      </div>
    </div>
  )
}
