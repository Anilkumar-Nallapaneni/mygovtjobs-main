import { useMemo, type CSSProperties } from 'react'
import { CATS, type CategoryId } from '@/data/categories'
import { PROFESSION_CHIP_FOR_CATEGORY } from '@/utils/latestNotificationsFilters'
import type { buildLatestNotificationsData } from '@/utils/latestNotificationsTable'

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string

export function LatestNotificationsCategoryFilter({
  sectorGroups,
  total,
  activeCategory,
  activeProfession,
  onSelectCategory,
  onSelectProfession,
  t,
}: {
  sectorGroups: ReturnType<typeof buildLatestNotificationsData>['sectorGroups']
  total: number
  activeCategory: CategoryId | null
  activeProfession: string | null
  onSelectCategory: (id: CategoryId | null) => void
  onSelectProfession: (slug: string | null) => void
  t: TranslateFn
}) {
  const counts = useMemo(
    () => Object.fromEntries(sectorGroups.map((s) => [s.id, s.count])),
    [sectorGroups]
  )

  const handleChipClick = (catId: CategoryId) => {
    const profSlug = PROFESSION_CHIP_FOR_CATEGORY[catId]
    if (profSlug) {
      onSelectProfession(activeProfession === profSlug ? null : profSlug)
      return
    }
    onSelectCategory(activeCategory === catId ? null : catId)
  }

  const isChipActive = (catId: CategoryId) => {
    const profSlug = PROFESSION_CHIP_FOR_CATEGORY[catId]
    if (profSlug) return activeProfession === profSlug
    return activeCategory === catId
  }

  const anyActive = Boolean(activeCategory || activeProfession)

  return (
    <div className="latest-notif__cat-filter">
      <span className="latest-notif__cat-filter-label">
        {t('latestNotif.browseCategory', { defaultValue: 'Browse by category' })}
      </span>
      <div className="latest-notif__cat-filter-pills" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!anyActive}
          className={`latest-notif__cat-pill${!anyActive ? ' latest-notif__cat-pill--active' : ''}`}
          onClick={() => {
            onSelectCategory(null)
            onSelectProfession(null)
          }}
        >
          {t('latestNotif.allCategories', { defaultValue: 'All' })}
          <span className="latest-notif__cat-pill-count">({total})</span>
        </button>
        {CATS.map((c) => {
          const cnt = counts[c.id]
          if (!cnt) return null
          const active = isChipActive(c.id)
          const labelKey = PROFESSION_CHIP_FOR_CATEGORY[c.id]
            ? c.id === 'health'
              ? 'latestNotif.medical'
              : 'category.engineering'
            : `category.${c.id}`
          const labelDefault =
            c.id === 'health' ? 'Medical' : c.id === 'engineering' ? 'Engineering' : c.name
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`latest-notif__cat-pill${active ? ' latest-notif__cat-pill--active' : ''}`}
              onClick={() => handleChipClick(c.id)}
              style={{ '--cat-color': c.color } as CSSProperties}
            >
              <span className="latest-notif__cat-pill-icon" aria-hidden>
                {c.icon}
              </span>
              {t(labelKey, { defaultValue: labelDefault })}
              <span className="latest-notif__cat-pill-count">({cnt})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
