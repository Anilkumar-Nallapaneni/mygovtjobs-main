import { useTranslation } from 'react-i18next'
import { numberLocale } from '@/utils/formatLocale'
import { deriveHeadlineStats } from '@/utils/headlineStats'
import type { CatalogStats } from '@/utils/liveJobsPipeline'
import type { HeadlineStats } from '@/utils/headlineStats'

type HeadlineStatsBarProps = {
  catalogStats?: CatalogStats | null
  liveCount?: number
  orgCount: number
  /** compact = navbar; hero = mobile home hero; page = standalone page header */
  variant?: 'compact' | 'hero' | 'page'
  className?: string
  /** Paint placeholder counts before live catalog arrives. */
  loading?: boolean
  fallbackStats?: HeadlineStats | null
}

export default function HeadlineStatsBar({
  catalogStats = null,
  liveCount = 0,
  orgCount,
  variant = 'page',
  className = '',
  loading = false,
  fallbackStats = null,
}: HeadlineStatsBarProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)
  const liveStats = deriveHeadlineStats(catalogStats, liveCount, orgCount)
  const hasLiveStats = Boolean(liveStats.notifications || liveStats.vacancies)
  const stats =
    loading && !hasLiveStats && fallbackStats ? fallbackStats : liveStats

  if (!stats.notifications && !stats.vacancies && !stats.orgs) return null

  const formatted = {
    notifications: stats.notifications.toLocaleString(locale),
    vacancies: stats.vacancies.toLocaleString(locale),
    orgs: stats.orgs.toLocaleString(locale),
  }
  const pending = loading && !hasLiveStats

  const line =
    variant === 'hero'
      ? t('nav.statsLineMobile', {
          ...formatted,
          defaultValue: '{{vacancies}} vacancies · {{notifications}} notifications · {{orgs}} orgs',
        })
      : t('nav.statsLine', {
          ...formatted,
          defaultValue: '{{notifications}} notifications · {{vacancies}} vacancies · {{orgs}} orgs',
        })

  return (
    <div
      className={`headline-stats headline-stats--${variant}${pending ? ' headline-stats--pending' : ''}${className ? ` ${className}` : ''}`}
      title={t('nav.statsTooltip', {
        defaultValue: 'Live counts from verified official government sources',
      })}
      aria-label={line}
      aria-busy={pending || undefined}
    >
      <span className="headline-stats__line">{line}</span>
    </div>
  )
}
