import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfessionBySlug, applyProfessionToBrowseState, professionDefaultSort } from '@/data/professions'
import { getQualificationBySlug } from '@/data/qualifications'
import { isValidResultTopicSlug } from '@/data/resultTopics'
import type { HeroStatFilterKey, HomeSortKey } from '@/utils/homePageFilters'
import {
  applyQualificationToBrowseState,
  browseScrollTarget,
  buildBrowseUrl,
  isPageReload,
  parseBrowsePath,
  parseBrowseQuery,
  parseResultsHubQuery,
  RESULTS_TOPICS_INDEX_PATH,
  shouldRedirectJobsToHome,
} from '@/utils/browseRoutes'
import { scrollToSection } from '@/utils/scrollToSection'
import type { BrowseStateCore } from '@/hooks/browse/useBrowseStateCore'

export function useBrowseRouteSync(core: BrowseStateCore) {
  const navigate = useNavigate()
  const {
    location,
    pathname,
    isJobDetailRoute,
    isLatestNotificationsRoute,
    isResultsHubRoute,
    isBrowseRoute,
    setSelectedState,
    setActiveCat,
    setQuickFilterState,
    setSortState,
    setHeroStatFilterState,
    setSearch,
    setSearchInput,
    setHeadlinesTopicKey,
    setQualificationSlug,
    setProfessionSlug,
    setOrgSlug,
    setAllIndiaBrowse,
    prevBrowsePathRef,
    quickFilter,
    sort,
    heroStatFilter,
    search,
  } = core

  const pushBrowseUrl = useCallback(
    (
      path: string,
      query: {
        quickFilter?: string | null
        sort?: HomeSortKey
        heroStatFilter?: HeroStatFilterKey | null
        search?: string | null
      }
    ) => {
      navigate(
        buildBrowseUrl(path, {
          quickFilter: query.quickFilter ?? quickFilter,
          sort: query.sort ?? sort,
          heroStatFilter: query.heroStatFilter ?? heroStatFilter,
          search: query.search ?? search,
        })
      )
    },
    [navigate, quickFilter, sort, heroStatFilter, search]
  )

  useEffect(() => {
    if (isJobDetailRoute || isLatestNotificationsRoute) return
    if (/^\/results\/[^/]+$/i.test(pathname)) {
      const slug = decodeURIComponent(pathname.replace(/^\/results\//, '')).toLowerCase()
      if (slug !== 'admit-card' && slug !== 'topics' && !isValidResultTopicSlug(slug)) {
        navigate(RESULTS_TOPICS_INDEX_PATH, { replace: true })
        return
      }
    }
    if (!isBrowseRoute) return

    if (isPageReload() && shouldRedirectJobsToHome(pathname, location.search)) {
      navigate('/', { replace: true })
      window.scrollTo(0, 0)
      return
    }

    const parsed = parseBrowsePath(pathname)
    const query = parseBrowseQuery(location.search)
    const hubQuery = isResultsHubRoute ? parseResultsHubQuery(location.search) : null
    setSelectedState(hubQuery ? hubQuery.stateId : parsed.stateId)
    setQualificationSlug(parsed.qualificationSlug)
    setProfessionSlug(parsed.professionSlug)
    setOrgSlug(parsed.orgSlug)
    setAllIndiaBrowse(parsed.allIndia)
    setHeadlinesTopicKey(parsed.headlinesTopicKey)

    if (parsed.professionSlug) {
      const prof = getProfessionBySlug(parsed.professionSlug)
      if (prof) {
        const applied = applyProfessionToBrowseState(prof)
        setActiveCat(applied.categoryId)
        setQuickFilterState(query.quickFilter ?? applied.quickFilter)
        setQualificationSlug(applied.qualificationSlug)
        if (!location.search.includes('sort=')) {
          setSortState(professionDefaultSort())
        }
      }
    } else if (parsed.qualificationSlug) {
      const def = getQualificationBySlug(parsed.qualificationSlug)
      if (def) {
        const applied = applyQualificationToBrowseState(def)
        setActiveCat(applied.categoryId)
        setQuickFilterState(query.quickFilter ?? applied.quickFilter)
      }
    } else if (parsed.categoryId) {
      setActiveCat(parsed.categoryId)
      setQuickFilterState(query.quickFilter)
    } else {
      setActiveCat(hubQuery ? hubQuery.categoryId : parsed.categoryId)
      setQuickFilterState(query.quickFilter)
    }

    setSortState(query.sort)
    setHeroStatFilterState(query.heroStatFilter)
    if (query.search) {
      setSearch(query.search)
      setSearchInput(query.search)
    }

    if (isPageReload() && parsed.view === 'home' && pathname === '/') {
      window.scrollTo(0, 0)
    }

    const sectionId = browseScrollTarget(parsed)
    if (!sectionId || isPageReload()) return
    const pathChanged = prevBrowsePathRef.current !== pathname
    prevBrowsePathRef.current = pathname
    if (!pathChanged) return
    if (parsed.qualificationSlug || parsed.professionSlug || parsed.orgSlug || parsed.allIndia || parsed.categoryId) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    const timer = window.requestAnimationFrame(() => {
      scrollToSection(sectionId, { behavior: 'instant' })
    })
    return () => window.cancelAnimationFrame(timer)
  }, [
    pathname,
    location.search,
    isBrowseRoute,
    isJobDetailRoute,
    isLatestNotificationsRoute,
    isResultsHubRoute,
    navigate,
    setSelectedState,
    setActiveCat,
    setQuickFilterState,
    setSortState,
    setHeroStatFilterState,
    setSearch,
    setSearchInput,
    setHeadlinesTopicKey,
    setQualificationSlug,
    setProfessionSlug,
    setOrgSlug,
    setAllIndiaBrowse,
    prevBrowsePathRef,
  ])

  return { pushBrowseUrl }
}
