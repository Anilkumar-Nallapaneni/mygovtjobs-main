import type { BrowseStateCore } from '@/hooks/browse/useBrowseStateCore'
import type { BrowseFilters } from '@/hooks/browse/useBrowseFilters'
import { useBrowseFooterNavigation } from '@/hooks/browse/useBrowseFooterNavigation'
import { useBrowseHeadlinesNavigation } from '@/hooks/browse/useBrowseHeadlinesNavigation'
import { useBrowseMapNavigation } from '@/hooks/browse/useBrowseMapNavigation'

export function useBrowseNavigation(core: BrowseStateCore, filters: BrowseFilters) {
  const map = useBrowseMapNavigation(core, filters)
  const headlines = useBrowseHeadlinesNavigation(core, { resetToHome: map.resetToHome })
  const footer = useBrowseFooterNavigation(core)

  return {
    handleResultsHubStateSelect: map.handleResultsHubStateSelect,
    handleResultsHubCategorySelect: map.handleResultsHubCategorySelect,
    handleAllIndiaBrowse: map.handleAllIndiaBrowse,
    handleStateFilter: map.handleStateFilter,
    handleStateSelect: map.handleStateSelect,
    handleCategoryFilter: map.handleCategoryFilter,
    handleCategorySelect: map.handleCategorySelect,
    handleNavigate: headlines.handleNavigate,
    handleFooterLink: footer.handleFooterLink,
    navigateToQualification: map.navigateToQualification,
    navigateToProfession: map.navigateToProfession,
    navigateToOrg: map.navigateToOrg,
  }
}
