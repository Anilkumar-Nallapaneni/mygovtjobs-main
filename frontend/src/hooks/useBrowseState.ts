import { useBrowseStateCore } from '@/hooks/browse/useBrowseStateCore'
import { useBrowseRouteSync } from '@/hooks/browse/useBrowseRouteSync'
import { useBrowseFilters } from '@/hooks/browse/useBrowseFilters'
import { useBrowseNavigation } from '@/hooks/browse/useBrowseNavigation'
import { useBrowseLandingMeta } from '@/hooks/browse/useBrowseLandingMeta'

export type { FooterLinkTarget } from '@/hooks/browseStateTypes'

export function useBrowseState() {
  const core = useBrowseStateCore()
  const { pushBrowseUrl } = useBrowseRouteSync(core)
  const filters = useBrowseFilters(core, pushBrowseUrl)
  const navigation = useBrowseNavigation(core, filters)
  const landing = useBrowseLandingMeta(core)

  return {
    location: core.location,
    view: core.view,
    selectedState: core.selectedState,
    activeCat: core.activeCat,
    quickFilter: core.quickFilter,
    setQuickFilter: filters.setQuickFilter,
    sort: core.sort,
    setSort: filters.setSort,
    heroStatFilter: core.heroStatFilter,
    setHeroStatFilter: filters.setHeroStatFilter,
    search: core.search,
    searchInput: core.searchInput,
    setSearchInput: core.setSearchInput,
    searchSubmitKey: filters.searchSubmitKey,
    headlinesTopicKey: core.headlinesTopicKey,
    setHeadlinesTopicKey: core.setHeadlinesTopicKey,
    qualificationSlug: core.qualificationSlug,
    professionSlug: core.professionSlug,
    orgSlug: core.orgSlug,
    allIndiaBrowse: core.allIndiaBrowse,
    orgDept: landing.orgDept,
    browseLandingTitle: landing.browseLandingTitle,
    browseLandingDescription: landing.browseLandingDescription,
    isResultsHubRoute: core.isResultsHubRoute,
    headlinesLandingTitle: landing.headlinesLandingTitle,
    headlinesLandingDescription: landing.headlinesLandingDescription,
    isJobDetailRoute: core.isJobDetailRoute,
    isLatestNotificationsRoute: core.isLatestNotificationsRoute,
    clearSearch: filters.clearSearch,
    handleSearch: filters.handleSearch,
    handleBrowseJobs: filters.handleBrowseJobs,
    handleAllIndiaBrowse: navigation.handleAllIndiaBrowse,
    handleStateFilter: navigation.handleStateFilter,
    handleStateSelect: navigation.handleStateSelect,
    handleResultsHubStateSelect: navigation.handleResultsHubStateSelect,
    handleResultsHubCategorySelect: navigation.handleResultsHubCategorySelect,
    handleCategoryFilter: navigation.handleCategoryFilter,
    handleCategorySelect: navigation.handleCategorySelect,
    handleNavigate: navigation.handleNavigate,
    handleFooterLink: navigation.handleFooterLink,
    navigateToQualification: navigation.navigateToQualification,
    navigateToProfession: navigation.navigateToProfession,
    navigateToOrg: navigation.navigateToOrg,
  }
}

export type BrowseState = ReturnType<typeof useBrowseState>
