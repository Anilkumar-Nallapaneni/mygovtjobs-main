import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LATEST_NOTIF_STATE_CHIPS } from '@/data/statesChips'
import LatestJobsSimpleTable from '@/components/home/LatestJobsSimpleTable'
import { LatestNotificationsCategoryFilter } from '@/components/home/latestNotifications/LatestNotificationsCategoryFilter'
import {
  LatestNotificationsEmptyState,
  LatestNotificationsFilteredEmptyState,
  LatestNotificationsLoadingState,
} from '@/components/home/latestNotifications/LatestNotificationsEmptyStates'
import { LatestNotificationsEducationFilter } from '@/components/home/latestNotifications/LatestNotificationsEducationFilter'
import {
  groupMetaLine,
  LatestNotificationsJobRow,
  LatestNotificationsMajorSectionHeader,
  LatestNotificationsSubSectionHeader,
  LatestNotificationsTableHead,
} from '@/components/home/latestNotifications/LatestNotificationsJobRow'
import {
  filterSectorGroupsByCategory,
  filterStateGroupsByCategory,
} from '@/components/home/latestNotifications/latestNotificationsGroupFilters'
import { LatestNotificationsStateFilter } from '@/components/home/latestNotifications/LatestNotificationsStateFilter'
import {
  buildLatestNotificationsData,
  filterExpiringSoonRows,
  type LatestTableSortKey,
  type NotificationRow,
} from '@/utils/latestNotificationsTable'
import {
  countJobsByState,
  filterLatestNotificationJobs,
} from '@/utils/latestNotificationsFilters'
import {
  aggregateCountsByQuickFilter,
  computeEducationVacancySummary,
} from '@/utils/educationVacancySummary'
import type { LatestNotifQuery } from '@/utils/browseRoutes'
import { dateTimeLocale } from '@/utils/formatLocale'
import type { JobRecord } from '@/types/job'

export type LatestViewMode = 'simple' | 'detailed'

function ExpiringSoonPanel({
  rows,
  locale,
  onRowClick,
  t,
}: {
  rows: NotificationRow[]
  locale: string
  onRowClick: (row: NotificationRow) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  if (!rows.length) return null
  return (
    <div className="latest-notif__panel latest-notif__panel--expiring">
      <h2 className="latest-notif__panel-title">
        {t('latestNotif.expiringTitle', { defaultValue: 'Expiring soon (≤7 days)' })}
      </h2>
      <p className="latest-notif__intro latest-notif__intro--expiring">
        {t('latestNotif.expiringIntro', {
          defaultValue: 'Apply before the deadline — official notifications closing within the next week.',
        })}
      </p>
      <div className="latest-notif__wrap">
        <table className="latest-notif__table">
          <LatestNotificationsTableHead t={t} />
          <tbody>
            {rows.map((row) => (
              <LatestNotificationsJobRow key={row.id} row={row} locale={locale} onRowClick={onRowClick} t={t} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StateWiseTable({
  stateGroups,
  locale,
  onRowClick,
  t,
}: {
  stateGroups: ReturnType<typeof buildLatestNotificationsData>['stateGroups']
  locale: string
  onRowClick: (row: NotificationRow) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <div className="latest-notif__panel">
      <h2 className="latest-notif__panel-title">
        {t('latestNotif.byState', { defaultValue: 'State-wise notifications' })}
      </h2>
      <div className="latest-notif__wrap">
        <table className="latest-notif__table latest-notif__table--grouped">
          <LatestNotificationsTableHead t={t} />
          {stateGroups.map((state) => (
            <tbody key={state.id} className="latest-notif__state-group">
              <LatestNotificationsMajorSectionHeader
                variant="state"
                label={state.name}
                meta={groupMetaLine(state, t)}
              />
              {state.categoryGroups.flatMap((cat) => [
                <LatestNotificationsSubSectionHeader
                  key={`${state.id}-${cat.id}-head`}
                  variant="category"
                  label={cat.name}
                  meta={groupMetaLine(cat, t)}
                />,
                ...cat.rows.map((row) => (
                  <LatestNotificationsJobRow
                    key={row.id}
                    row={row}
                    locale={locale}
                    onRowClick={onRowClick}
                    t={t}
                  />
                )),
              ])}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}

function CategoryWiseTable({
  sectorGroups,
  locale,
  onRowClick,
  t,
}: {
  sectorGroups: ReturnType<typeof buildLatestNotificationsData>['sectorGroups']
  locale: string
  onRowClick: (row: NotificationRow) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <div className="latest-notif__panel">
      <h2 className="latest-notif__panel-title">
        {t('latestNotif.byCategory', { defaultValue: 'Category-wise notifications' })}
      </h2>
      <div className="latest-notif__wrap">
        <table className="latest-notif__table latest-notif__table--grouped">
          <LatestNotificationsTableHead t={t} />
          {sectorGroups.map((sector) => (
            <tbody key={sector.id} className="latest-notif__sector-group">
              <LatestNotificationsMajorSectionHeader
                variant="category"
                label={sector.name}
                meta={groupMetaLine(sector, t)}
              />
              {sector.stateGroups.flatMap((state) => [
                <LatestNotificationsSubSectionHeader
                  key={`${sector.id}-${state.id}-head`}
                  variant="state"
                  label={state.name}
                  meta={groupMetaLine(state, t)}
                />,
                ...state.rows.map((row) => (
                  <LatestNotificationsJobRow
                    key={row.id}
                    row={row}
                    locale={locale}
                    onRowClick={onRowClick}
                    t={t}
                  />
                )),
              ])}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}

export default function LatestNotificationsTable({
  jobs = [],
  loading = false,
  onJobClick,
  viewMode = 'detailed',
  onViewModeChange,
  query,
  onQueryChange,
}: {
  jobs?: JobRecord[]
  loading?: boolean
  onJobClick?: (job: JobRecord) => void
  viewMode?: LatestViewMode
  onViewModeChange?: (mode: LatestViewMode) => void
  query: LatestNotifQuery
  onQueryChange: (patch: Partial<LatestNotifQuery>) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = dateTimeLocale(i18n.language)

  const unfilteredData = useMemo(() => buildLatestNotificationsData(jobs), [jobs])
  const stateCounts = useMemo(() => countJobsByState(jobs), [jobs])
  const quickFilterCounts = useMemo(() => {
    const summary = computeEducationVacancySummary(jobs, { liveOnly: false })
    return aggregateCountsByQuickFilter(summary)
  }, [jobs])

  const filteredJobs = useMemo(
    () =>
      filterLatestNotificationJobs(jobs, {
        stateId: query.stateId,
        categoryId: query.categoryId,
        professionSlug: query.professionSlug,
        quickFilter: query.quickFilter,
        expiringOnly: query.showExpiring,
      }),
    [jobs, query.stateId, query.categoryId, query.professionSlug, query.quickFilter, query.showExpiring]
  )

  const { items, stateGroups, sectorGroups, total, vacancyTotal } = useMemo(
    () => buildLatestNotificationsData(filteredJobs),
    [filteredJobs]
  )

  const expiringRows = useMemo(() => filterExpiringSoonRows(unfilteredData.items), [unfilteredData.items])

  const activeCategoryForGroups = query.professionSlug ? null : query.categoryId

  const filteredStateGroups = useMemo(
    () => filterStateGroupsByCategory(stateGroups, activeCategoryForGroups),
    [stateGroups, activeCategoryForGroups]
  )

  const filteredSectorGroups = useMemo(
    () => filterSectorGroupsByCategory(sectorGroups, activeCategoryForGroups),
    [sectorGroups, activeCategoryForGroups]
  )

  const filteredTotal = useMemo(() => {
    if (!query.categoryId && !query.professionSlug) return total
    if (query.professionSlug) return total
    const group = sectorGroups.find((s) => s.id === query.categoryId)
    return group?.count ?? total
  }, [query.categoryId, query.professionSlug, sectorGroups, total])

  const filteredVacancyTotal = useMemo(() => {
    if (!query.categoryId && !query.professionSlug) return vacancyTotal
    if (query.professionSlug) return vacancyTotal
    const group = sectorGroups.find((s) => s.id === query.categoryId)
    return group?.vacancyTotal ?? vacancyTotal
  }, [query.categoryId, query.professionSlug, sectorGroups, vacancyTotal])

  const handleRowClick = (row: NotificationRow) => {
    if (row._job) onJobClick?.(row._job)
  }

  const showExpiringSection =
    !query.showExpiring &&
    !query.stateId &&
    !query.categoryId &&
    !query.professionSlug &&
    !query.quickFilter &&
    expiringRows.length > 0

  if (loading && !jobs.length) {
    return <LatestNotificationsLoadingState t={t} />
  }

  if (!unfilteredData.total) {
    return <LatestNotificationsEmptyState t={t} />
  }

  const introKey = query.quickFilter
    ? 'latestNotif.introEducation'
    : query.professionSlug
      ? 'latestNotif.introProfession'
      : query.categoryId
        ? 'latestNotif.introFiltered'
        : query.stateId
          ? 'latestNotif.introState'
          : 'latestNotif.intro'

  return (
    <div className="latest-notif">
      {onViewModeChange ? (
        <div className="latest-notif__view-toggle" role="group" aria-label={t('latestNotif.viewMode')}>
          <button
            type="button"
            className={`latest-notif__view-btn${viewMode === 'simple' ? ' latest-notif__view-btn--active' : ''}`}
            aria-pressed={viewMode === 'simple'}
            onClick={() => onViewModeChange('simple')}
          >
            {t('latestNotif.viewSimple', { defaultValue: 'Simple' })}
          </button>
          <button
            type="button"
            className={`latest-notif__view-btn${viewMode === 'detailed' ? ' latest-notif__view-btn--active' : ''}`}
            aria-pressed={viewMode === 'detailed'}
            onClick={() => onViewModeChange('detailed')}
          >
            {t('latestNotif.viewDetailed', { defaultValue: 'Detailed' })}
          </button>
        </div>
      ) : null}

      <LatestNotificationsStateFilter
        total={unfilteredData.total}
        stateCounts={stateCounts}
        activeStateId={query.stateId}
        onSelect={(stateId) => onQueryChange({ stateId })}
        t={t}
      />

      <LatestNotificationsEducationFilter
        counts={quickFilterCounts}
        activeFilter={query.quickFilter}
        locale={locale}
        onSelect={(quickFilter) => onQueryChange({ quickFilter })}
        t={t}
      />

      {viewMode === 'simple' ? (
        <>
          <p className="latest-notif__intro">
            {t('latestNotif.introSimple', {
              defaultValue: 'Flat list of official notifications — click a row for full details.',
            })}
          </p>
          <LatestJobsSimpleTable
            rows={items}
            sort={query.sort as LatestTableSortKey}
            onSortChange={(sort) => onQueryChange({ sort })}
            onRowClick={handleRowClick}
          />
        </>
      ) : (
        <>
          <LatestNotificationsCategoryFilter
            sectorGroups={unfilteredData.sectorGroups}
            total={unfilteredData.total}
            activeCategory={query.categoryId}
            activeProfession={query.professionSlug}
            onSelectCategory={(categoryId) => onQueryChange({ categoryId, professionSlug: null })}
            onSelectProfession={(professionSlug) => onQueryChange({ professionSlug, categoryId: null })}
            t={t}
          />

          <p className="latest-notif__intro">
            {t(introKey, {
              category: query.categoryId ? t(`category.${query.categoryId}`) : '',
              profession: query.professionSlug
                ? t(`profession.${query.professionSlug}`, {
                    defaultValue: query.professionSlug.replace(/-/g, ' '),
                  })
                : '',
              education: query.quickFilter
                ? t(`quickFilter.${query.quickFilter}`, { defaultValue: query.quickFilter })
                : '',
              state:
                query.stateId === 'all'
                  ? t('common.allIndia', { defaultValue: 'All India' })
                  : query.stateId
                    ? (LATEST_NOTIF_STATE_CHIPS.find((s) => s.id === query.stateId)?.n || query.stateId)
                    : '',
              defaultValue:
                'Official government notifications grouped by state and category. Each section is split inside the table.',
            })}
          </p>

          {showExpiringSection ? (
            <ExpiringSoonPanel rows={expiringRows} locale={locale} onRowClick={handleRowClick} t={t} />
          ) : null}

          {query.showExpiring && items.length > 0 ? (
            <ExpiringSoonPanel rows={items} locale={locale} onRowClick={handleRowClick} t={t} />
          ) : null}

          {!query.showExpiring && filteredStateGroups.length > 0 ? (
            <StateWiseTable
              stateGroups={filteredStateGroups}
              locale={locale}
              onRowClick={handleRowClick}
              t={t}
            />
          ) : null}

          {!query.showExpiring && filteredSectorGroups.length > 0 ? (
            <CategoryWiseTable
              sectorGroups={filteredSectorGroups}
              locale={locale}
              onRowClick={handleRowClick}
              t={t}
            />
          ) : null}

          {!query.showExpiring && total === 0 ? <LatestNotificationsFilteredEmptyState t={t} /> : null}
        </>
      )}

      <p className="latest-notif__meta">
        {t('latestNotif.metaTotal', {
          total: filteredTotal,
          defaultValue: '{{total}} official listings',
        })}
        {filteredVacancyTotal > 0
          ? ` · ${t('latestNotif.metaVacancies', {
              total: filteredVacancyTotal,
              defaultValue: '{{total}} vacancies',
            })}`
          : ''}
        {showExpiringSection || expiringRows.length > 0 ? (
          <>
            {' · '}
            <button
              type="button"
              className="latest-notif__expiring-link"
              onClick={() =>
                onQueryChange({
                  showExpiring: !query.showExpiring,
                  stateId: null,
                  categoryId: null,
                  professionSlug: null,
                })
              }
            >
              {query.showExpiring
                ? t('latestNotif.showAll', { defaultValue: 'Show all' })
                : t('latestNotif.expiringOnly', {
                    count: expiringRows.length,
                    defaultValue: '{{count}} expiring soon',
                  })}
            </button>
          </>
        ) : null}
      </p>
    </div>
  )
}
