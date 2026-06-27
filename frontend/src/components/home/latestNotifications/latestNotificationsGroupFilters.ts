import type { buildLatestNotificationsData } from '@/utils/latestNotificationsTable'
import type { CategoryId } from '@/data/categories'

type StateGroup = ReturnType<typeof buildLatestNotificationsData>['stateGroups'][number]
type SectorGroup = ReturnType<typeof buildLatestNotificationsData>['sectorGroups'][number]

export function filterStateGroupsByCategory(stateGroups: StateGroup[], categoryId: CategoryId | null) {
  if (!categoryId) return stateGroups
  return stateGroups
    .map((state) => {
      const catGroup = state.categoryGroups.find((c) => c.id === categoryId)
      if (!catGroup) return null
      return {
        ...state,
        count: catGroup.count,
        vacancyTotal: catGroup.vacancyTotal,
        categoryGroups: [catGroup],
      }
    })
    .filter(Boolean) as StateGroup[]
}

export function filterSectorGroupsByCategory(sectorGroups: SectorGroup[], categoryId: CategoryId | null) {
  if (!categoryId) return sectorGroups
  return sectorGroups.filter((s) => s.id === categoryId)
}
