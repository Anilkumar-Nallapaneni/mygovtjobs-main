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
import { getResultTopicByKey, resultTopicRoutePath } from '@/data/resultTopics'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { BrowseStateCore } from '@/hooks/browse/useBrowseStateCore'
import type { BrowseFilters } from '@/hooks/browse/useBrowseFilters'
import {
  ALL_INDIA_JOBS_PATH,
  applyQualificationToBrowseState,
  buildBrowsePath,
  buildBrowseUrl,
  buildResultsHubUrl,
  isValidCategoryId,
  isValidStateId,
  LATEST_NOTIFICATIONS_PATH,
  orgRoutePath,
  parseResultsHubQuery,
  qualificationRoutePath,
} from '@/utils/browseRoutes'
import { scrollToSection } from '@/utils/scrollToSection'

export function useBrowseNavigation(core: BrowseStateCore, filters: BrowseFilters) {
  const navigate = useNavigate()
  const { clearSearch } = filters
  const {
    location,
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
    scrollToSection('main-jobs')
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
        scrollToSection('main-jobs')
        return
      }
      startTransition(() => {
        setQuickFilterState(null)
        setHeroStatFilterState(null)
        clearSearch({ syncUrl: false })
        setHeadlinesTopicKey(null)
        handleCategoryFilter(catId)
      })
      scrollToSection('main-jobs')
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
        scrollToSection('india-map-panel', { behavior: 'instant' })
        return
      }
      setQuickFilterState(null)
      setHeroStatFilterState(null)
      clearSearch({ syncUrl: false })
      setHeadlinesTopicKey(null)
      handleStateFilter(stateId)
      scrollToSection(stateId ? 'india-map-panel' : 'main-jobs', { behavior: 'instant' })
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      window.scrollTo({ top: 0, behavior: 'auto' })
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
      window.scrollTo({ top: 0, behavior: 'auto' })
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
      window.scrollTo({ top: 0, behavior: 'auto' })
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

  const navigateToHeadlinesHub = useCallback(
    (topicKey: string | null, path: string) => {
      const hubQuery = parseResultsHubQuery(location.search)
      startTransition(() => {
        setQuickFilterState(null)
        setHeroStatFilterState(null)
        setHeadlinesTopicKey(topicKey)
        if (isResultsHubRoute) {
          setSelectedState(hubQuery.stateId)
          setActiveCat(hubQuery.categoryId)
          navigate(buildResultsHubUrl(path, hubQuery))
        } else {
          setSelectedState(null)
          setActiveCat(null)
          navigate(path)
        }
      })
      window.setTimeout(() => scrollToSection('official-headlines'), 140)
    },
    [
      navigate,
      location.search,
      isResultsHubRoute,
      setQuickFilterState,
      setHeroStatFilterState,
      setHeadlinesTopicKey,
      setSelectedState,
      setActiveCat,
    ]
  )

  const handleNavigate = useCallback(
    (nextView: string) => {
      if (nextView === 'home') {
        resetToHome()
        return
      }
      startTransition(() => {
        if (nextView === 'jobs') {
          setQuickFilterState(null)
          setHeroStatFilterState(null)
          navigate(buildBrowseUrl('/jobs', { sort, search: search || null }))
          return
        }
        if (nextView === 'admit-card') {
          navigateToHeadlinesHub('admit-card', resultTopicRoutePath('admit-card'))
          return
        }
        if (nextView === 'results') {
          navigateToHeadlinesHub('sarkari-result', resultTopicRoutePath('sarkari-result'))
          return
        }
        if (nextView === 'alert') {
          setSelectedState(null)
          setActiveCat(null)
          setQuickFilterState(null)
          setHeroStatFilterState(null)
          setHeadlinesTopicKey(null)
          navigate(buildBrowsePath({ view: 'alert' }))
          window.setTimeout(() => scrollToSection('alert-section'), 140)
          return
        }
        navigate(
          buildBrowsePath({
            view: nextView as 'results' | 'admit-card' | 'alert',
          })
        )
      })
    },
    [
      navigate,
      resetToHome,
      sort,
      search,
      navigateToHeadlinesHub,
      setQuickFilterState,
      setHeroStatFilterState,
      setSelectedState,
      setActiveCat,
      setHeadlinesTopicKey,
    ]
  )

  const handleFooterLink = useCallback(
    (target: FooterLinkTarget) => {
      startTransition(() => {
        if (target.state) {
          navigate(
            buildBrowseUrl(`/state/${encodeURIComponent(target.state)}`, {
              quickFilter,
              sort,
              heroStatFilter,
              search: search || null,
            })
          )
          if (target.category && isValidCategoryId(target.category)) setActiveCat(target.category)
          scrollToSection('india-map-panel', { behavior: 'instant' })
          return
        }

        if (target.category && isValidCategoryId(target.category)) {
          navigate(
            buildBrowseUrl(`/category/${encodeURIComponent(target.category)}`, {
              quickFilter,
              sort,
              heroStatFilter,
              search: search || null,
            })
          )
          scrollToSection('main-jobs')
          return
        }

        if (target.view === 'admit-card') {
          navigate(buildResultsHubUrl(resultTopicRoutePath('admit-card')))
          setHeadlinesTopicKey('admit-card')
          scrollToSection('official-headlines')
          return
        }

        if (target.topicKey && getResultTopicByKey(target.topicKey)) {
          navigate(buildResultsHubUrl(resultTopicRoutePath(target.topicKey)))
          setHeadlinesTopicKey(target.topicKey)
          scrollToSection('official-headlines')
          return
        }

        if (target.view === 'results') {
          navigate(buildResultsHubUrl(resultTopicRoutePath('sarkari-result')))
          setHeadlinesTopicKey('sarkari-result')
          scrollToSection('official-headlines')
          return
        }

        if (target.sort) {
          setSortState(target.sort)
          navigate(
            buildBrowseUrl('/jobs', {
              sort: target.sort,
              quickFilter,
              heroStatFilter,
              search: search || null,
            })
          )
          scrollToSection(target.section || 'main-jobs')
          return
        }

        if (target.view === 'latest-notifications' || target.topicKey === 'latest') {
          navigate(LATEST_NOTIFICATIONS_PATH)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        if (target.view) {
          navigate(buildBrowsePath({ view: target.view as 'home' | 'jobs' | 'results' | 'alert' }))
        } else if (target.section === 'main-jobs' || target.section === 'state-jobs-panel') {
          navigate(
            buildBrowseUrl('/', {
              quickFilter,
              sort,
              heroStatFilter,
              search: search || null,
            })
          )
        } else if (target.section === 'official-headlines') {
          navigate(buildBrowsePath({ view: 'results' }))
        } else if (target.section === 'alert-section') {
          navigate(buildBrowsePath({ view: 'alert' }))
        }

        if (target.topicKey !== undefined) setHeadlinesTopicKey(target.topicKey)
        if (target.section) scrollToSection(target.section)
      })
    },
    [
      navigate,
      quickFilter,
      sort,
      heroStatFilter,
      search,
      setSortState,
      setActiveCat,
      setHeadlinesTopicKey,
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
    handleNavigate,
    handleFooterLink,
    navigateToQualification,
    navigateToProfession,
    navigateToOrg,
  }
}
