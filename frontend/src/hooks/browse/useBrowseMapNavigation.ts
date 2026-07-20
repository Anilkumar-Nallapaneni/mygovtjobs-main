import { startTransition, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CategoryId } from '@/data/categories'
import { getOrgBySlug } from '@/data/orgIndex'
import {
  applyProfessionToBrowseState,
  getProfessionBySlug,
  professionDefaultSort,
  professionRoutePath,
} from '@/data/professions'
import { getQualificationBySlug } from '@/data/qualifications'
import type { BrowseStateCore } from '@/hooks/browse/useBrowseStateCore'
import type { BrowseFilters } from '@/hooks/browse/useBrowseFilters'
import {
  scrollToBrowseSection,
  scrollToMainJobs,
  scrollToMapPanel,
  scrollWindowToTop,
} from '@/hooks/browse/browseScrollHelpers'
import {
  ALL_INDIA_JOBS_PATH,
  applyQualificationToBrowseState,
  buildBrowseUrl,
  buildResultsHubUrl,
  isValidStateId,
  orgRoutePath,
  qualificationRoutePath,
} from '@/utils/browseRoutes'

export function useBrowseMapNavigation(core: BrowseStateCore, filters: BrowseFilters) {
  const navigate = useNavigate()
  const { clearSearch } = filters
  const {
    pathname,
    isResultsHubRoute,
    selectedState,
    setSelectedState,
    activeCat,
    setActiveCat,
    quickFilter,
    sort,
    setSortState,
    heroStatFilter,
    search,
    setQuickFilterState,
    setHeroStatFilterState,
    setHeadlinesTopicKey,
    setQualificationSlug,
    setProfessionSlug,
    setOrgSlug,
    setAllIndiaBrowse,
  } = core

  const pushResultsHubUrl = useCallback(
    (path: string, stateId: string | null, categoryId: CategoryId | null) => {
      navigate(buildResultsHubUrl(path, { stateId, categoryId }))
    },
    [navigate]
  )

  const handleResultsHubStateSelect = useCallback(
    (stateId: string | null) => {
      const next = stateId === null ? null : selectedState === stateId ? null : stateId
      startTransition(() => {
        setSelectedState(next)
        if (isResultsHubRoute) {
          pushResultsHubUrl(pathname, next, activeCat)
        }
      })
    },
    [selectedState, isResultsHubRoute, pathname, activeCat, pushResultsHubUrl, setSelectedState]
  )

  const handleResultsHubCategorySelect = useCallback(
    (catId: CategoryId | null) => {
      const next = catId === null ? null : activeCat === catId ? null : catId
      startTransition(() => {
        setActiveCat(next)
        if (isResultsHubRoute) {
          pushResultsHubUrl(pathname, selectedState, next)
        }
      })
    },
    [activeCat, isResultsHubRoute, pathname, selectedState, pushResultsHubUrl, setActiveCat]
  )

  const handleAllIndiaBrowse = useCallback(() => {
    startTransition(() => {
      setSelectedState(null)
      setQuickFilterState(null)
      setHeroStatFilterState(null)
      setActiveCat(null)
      clearSearch({ syncUrl: false })
      setHeadlinesTopicKey(null)
      navigate(buildBrowseUrl(ALL_INDIA_JOBS_PATH, { sort, search: search || null }))
    })
    scrollToMainJobs()
  }, [navigate, sort, search, clearSearch, setSelectedState, setQuickFilterState, setHeroStatFilterState, setActiveCat, setHeadlinesTopicKey])

  const handleStateFilter = useCallback(
    (stateId: string | null) => {
      if (stateId && !isValidStateId(stateId)) return
      setSelectedState(stateId)
      if (stateId) {
        setActiveCat(null)
        setQualificationSlug(null)
        setProfessionSlug(null)
        setOrgSlug(null)
        setAllIndiaBrowse(false)
        navigate(
          buildBrowseUrl(`/state/${encodeURIComponent(stateId)}`, {
            quickFilter: null,
            sort,
            heroStatFilter: null,
            search: null,
          })
        )
        return
      }
      startTransition(() => {
        if (activeCat) {
          navigate(
            buildBrowseUrl(`/category/${encodeURIComponent(activeCat)}`, {
              quickFilter,
              sort,
              heroStatFilter,
              search: search || null,
            })
          )
        } else {
          navigate(
            buildBrowseUrl('/', {
              quickFilter,
              sort,
              heroStatFilter,
              search: search || null,
            })
          )
        }
      })
    },
    [
      activeCat,
      navigate,
      quickFilter,
      sort,
      heroStatFilter,
      search,
      setSelectedState,
      setActiveCat,
      setQualificationSlug,
      setProfessionSlug,
      setOrgSlug,
      setAllIndiaBrowse,
    ]
  )

  const handleCategoryFilter = useCallback(
    (catId: CategoryId | null) => {
      startTransition(() => {
        setActiveCat(catId)
        if (catId) {
          setSelectedState(null)
          setQualificationSlug(null)
          setProfessionSlug(null)
          setOrgSlug(null)
          setAllIndiaBrowse(false)
          navigate(
            buildBrowseUrl(`/category/${encodeURIComponent(catId)}`, {
              quickFilter: null,
              sort,
              heroStatFilter: null,
              search: null,
            })
          )
        } else {
          navigate(
            buildBrowseUrl('/', {
              quickFilter,
              sort,
              heroStatFilter,
              search: search || null,
            })
          )
        }
      })
    },
    [
      navigate,
      quickFilter,
      sort,
      heroStatFilter,
      search,
      setActiveCat,
      setSelectedState,
      setQualificationSlug,
      setProfessionSlug,
      setOrgSlug,
      setAllIndiaBrowse,
    ]
  )

  const handleCategorySelect = useCallback(
    (catId: CategoryId | null) => {
      if (
        catId !== null &&
        activeCat === catId &&
        pathname === `/category/${encodeURIComponent(catId)}`
      ) {
        scrollToMainJobs()
        return
      }
      startTransition(() => {
        setQuickFilterState(null)
        setHeroStatFilterState(null)
        clearSearch({ syncUrl: false })
        setHeadlinesTopicKey(null)
        handleCategoryFilter(catId)
      })
      scrollToMainJobs()
    },
    [activeCat, pathname, clearSearch, handleCategoryFilter, setQuickFilterState, setHeroStatFilterState, setHeadlinesTopicKey]
  )

  const handleStateSelect = useCallback(
    (stateId: string | null) => {
      if (
        stateId !== null &&
        selectedState === stateId &&
        pathname === `/state/${encodeURIComponent(stateId)}`
      ) {
        scrollToMapPanel()
        return
      }
      setQuickFilterState(null)
      setHeroStatFilterState(null)
      clearSearch({ syncUrl: false })
      setHeadlinesTopicKey(null)
      handleStateFilter(stateId)
      scrollToBrowseSection(stateId ? 'india-map-panel' : 'main-jobs', { behavior: 'instant' })
    },
    [selectedState, pathname, clearSearch, handleStateFilter, setQuickFilterState, setHeroStatFilterState, setHeadlinesTopicKey]
  )

  const resetToHome = useCallback(() => {
    startTransition(() => {
      clearSearch({ syncUrl: false })
      navigate('/')
      setSelectedState(null)
      setActiveCat(null)
      setQuickFilterState(null)
      setHeroStatFilterState(null)
      setSortState('lastDate')
      setHeadlinesTopicKey(null)
      setQualificationSlug(null)
      setProfessionSlug(null)
      setOrgSlug(null)
      setAllIndiaBrowse(false)
    })
    scrollWindowToTop('smooth')
  }, [
    navigate,
    clearSearch,
    setSelectedState,
    setActiveCat,
    setQuickFilterState,
    setHeroStatFilterState,
    setSortState,
    setHeadlinesTopicKey,
    setQualificationSlug,
    setProfessionSlug,
    setOrgSlug,
    setAllIndiaBrowse,
  ])

  const navigateToQualification = useCallback(
    (slug: string) => {
      const def = getQualificationBySlug(slug)
      if (!def) return
      const applied = applyQualificationToBrowseState(def)
      startTransition(() => {
        setSelectedState(null)
        setHeadlinesTopicKey(null)
        setQualificationSlug(slug)
        setProfessionSlug(null)
        setOrgSlug(null)
        setAllIndiaBrowse(false)
        setActiveCat(applied.categoryId)
        setQuickFilterState(applied.quickFilter)
        setHeroStatFilterState(null)
        clearSearch({ syncUrl: false })
      })
      navigate(
        buildBrowseUrl(qualificationRoutePath(slug), {
          quickFilter: applied.quickFilter,
          sort: 'lastDate',
          heroStatFilter: null,
          search: null,
        })
      )
      scrollWindowToTop('auto')
    },
    [
      navigate,
      clearSearch,
      setSelectedState,
      setHeadlinesTopicKey,
      setQualificationSlug,
      setProfessionSlug,
      setOrgSlug,
      setAllIndiaBrowse,
      setActiveCat,
      setQuickFilterState,
      setHeroStatFilterState,
    ]
  )

  const navigateToProfession = useCallback(
    (slug: string) => {
      const prof = getProfessionBySlug(slug)
      if (!prof) return
      const applied = applyProfessionToBrowseState(prof)
      startTransition(() => {
        setSelectedState(null)
        setHeadlinesTopicKey(null)
        setProfessionSlug(slug)
        setQualificationSlug(applied.qualificationSlug)
        setOrgSlug(null)
        setAllIndiaBrowse(false)
        setActiveCat(applied.categoryId)
        setQuickFilterState(applied.quickFilter)
        setHeroStatFilterState(null)
        setSortState(professionDefaultSort())
        clearSearch({ syncUrl: false })
      })
      navigate(
        buildBrowseUrl(professionRoutePath(slug), {
          quickFilter: applied.quickFilter,
          sort: professionDefaultSort(),
          heroStatFilter: null,
          search: null,
        })
      )
      scrollWindowToTop('auto')
    },
    [
      navigate,
      clearSearch,
      setSelectedState,
      setHeadlinesTopicKey,
      setProfessionSlug,
      setQualificationSlug,
      setOrgSlug,
      setAllIndiaBrowse,
      setActiveCat,
      setQuickFilterState,
      setHeroStatFilterState,
      setSortState,
    ]
  )

  const navigateToOrg = useCallback(
    (slug: string) => {
      const entry = getOrgBySlug(slug)
      if (!entry) return
      startTransition(() => {
        setSelectedState(null)
        setHeadlinesTopicKey(null)
        setOrgSlug(slug)
        setQualificationSlug(null)
        setProfessionSlug(null)
        setAllIndiaBrowse(false)
        setActiveCat(null)
        setQuickFilterState(null)
        setHeroStatFilterState(null)
        clearSearch({ syncUrl: false })
      })
      navigate(
        buildBrowseUrl(orgRoutePath(slug), {
          quickFilter: null,
          sort: 'lastDate',
          heroStatFilter: null,
          search: null,
        })
      )
      scrollWindowToTop('auto')
    },
    [
      navigate,
      clearSearch,
      setSelectedState,
      setHeadlinesTopicKey,
      setOrgSlug,
      setQualificationSlug,
      setProfessionSlug,
      setAllIndiaBrowse,
      setActiveCat,
      setQuickFilterState,
      setHeroStatFilterState,
    ]
  )

  return {
    handleResultsHubStateSelect,
    handleResultsHubCategorySelect,
    handleAllIndiaBrowse,
    handleStateFilter,
    handleStateSelect,
    handleCategoryFilter,
    handleCategorySelect,
    resetToHome,
    navigateToQualification,
    navigateToProfession,
    navigateToOrg,
  }
}
