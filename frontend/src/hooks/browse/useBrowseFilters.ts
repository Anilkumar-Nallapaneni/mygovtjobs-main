import { startTransition, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQualificationSlugForFilterKey } from '@/data/qualifications'
import type { HeroStatFilterKey, HomeSortKey } from '@/utils/homePageFilters'
import {
  ALL_INDIA_JOBS_PATH,
  buildBrowseUrl,
  orgRoutePath,
  parseBrowsePath,
  professionRoutePath,
  qualificationRoutePath,
} from '@/utils/browseRoutes'
import type { BrowseStateCore } from '@/hooks/browse/useBrowseStateCore'

type PushBrowseUrl = (
  path: string,
  query: {
    quickFilter?: string | null
    sort?: HomeSortKey
    heroStatFilter?: HeroStatFilterKey | null
    search?: string | null
  }
) => void

export function useBrowseFilters(core: BrowseStateCore, pushBrowseUrl: PushBrowseUrl) {
  const navigate = useNavigate()
  const {
    pathname,
    isBrowseRoute,
    quickFilter,
    setQuickFilterState,
    sort,
    setSortState,
    heroStatFilter,
    setHeroStatFilterState,
    search,
    setSearch,
    searchInput,
    setSearchInput,
    searchSubmitKey,
    setSearchSubmitKey,
    qualificationSlug,
    professionSlug,
    orgSlug,
    allIndiaBrowse,
    selectedState,
    activeCat,
  } = core

  const setQuickFilter = useCallback(
    (key: string | null) => {
      startTransition(() => {
        setQuickFilterState(key)
        setHeroStatFilterState(null)
        if (!isBrowseRoute) return
        if (!key) {
          const parsed = parseBrowsePath(pathname)
          const qualSlug = qualificationSlug || parsed.qualificationSlug
          const profSlug = professionSlug || parsed.professionSlug
          const org = orgSlug || parsed.orgSlug
          const stateId = selectedState || parsed.stateId
          const categoryId = activeCat || parsed.categoryId

          if (qualSlug) {
            pushBrowseUrl(qualificationRoutePath(qualSlug), {
              quickFilter: null,
              heroStatFilter: null,
            })
            return
          }
          if (profSlug) {
            pushBrowseUrl(professionRoutePath(profSlug), {
              quickFilter: null,
              heroStatFilter: null,
            })
            return
          }
          if (org) {
            pushBrowseUrl(orgRoutePath(org), { quickFilter: null, heroStatFilter: null })
            return
          }
          if (allIndiaBrowse || parsed.allIndia) {
            pushBrowseUrl(ALL_INDIA_JOBS_PATH, { quickFilter: null, heroStatFilter: null })
            return
          }
          if (stateId) {
            pushBrowseUrl(`/state/${encodeURIComponent(stateId)}`, {
              quickFilter: null,
              heroStatFilter: null,
            })
            return
          }
          if (categoryId) {
            pushBrowseUrl(`/category/${encodeURIComponent(categoryId)}`, {
              quickFilter: null,
              heroStatFilter: null,
            })
            return
          }
          pushBrowseUrl(pathname, { quickFilter: null, heroStatFilter: null })
          return
        }
        const slug = getQualificationSlugForFilterKey(key)
        if (slug) {
          navigate(
            buildBrowseUrl(qualificationRoutePath(slug), {
              quickFilter: key,
              heroStatFilter: null,
              sort,
              search: search || null,
            })
          )
          return
        }
        pushBrowseUrl(pathname, { quickFilter: key, heroStatFilter: null })
      })
    },
    [
      isBrowseRoute,
      pathname,
      pushBrowseUrl,
      navigate,
      sort,
      search,
      qualificationSlug,
      professionSlug,
      orgSlug,
      allIndiaBrowse,
      selectedState,
      activeCat,
      setQuickFilterState,
      setHeroStatFilterState,
    ]
  )

  const setSort = useCallback(
    (next: HomeSortKey) => {
      startTransition(() => {
        setSortState(next)
        if (isBrowseRoute) {
          pushBrowseUrl(pathname, { sort: next })
        }
      })
    },
    [isBrowseRoute, pathname, pushBrowseUrl, setSortState]
  )

  const setHeroStatFilter = useCallback(
    (key: HeroStatFilterKey | null) => {
      startTransition(() => {
        setHeroStatFilterState(key)
        if (isBrowseRoute) {
          pushBrowseUrl(pathname, {
            heroStatFilter: key,
            quickFilter: key ? null : quickFilter,
          })
        }
      })
    },
    [isBrowseRoute, pathname, pushBrowseUrl, quickFilter, setHeroStatFilterState]
  )

  const clearSearch = useCallback(
    (opts?: { syncUrl?: boolean }) => {
      startTransition(() => {
        setSearch('')
        setSearchInput('')
        if (opts?.syncUrl === false) return
        if (isBrowseRoute) {
          pushBrowseUrl(pathname, { search: null })
        }
      })
    },
    [isBrowseRoute, pathname, pushBrowseUrl, setSearch, setSearchInput]
  )

  const handleSearch = useCallback(() => {
    const q = searchInput.trim()
    if (!q) return
    startTransition(() => {
      setSearch(q)
      setSearchInput(q)
      setQuickFilterState(null)
      setHeroStatFilterState(null)
      setSearchSubmitKey((k) => k + 1)
      navigate(
        buildBrowseUrl('/jobs', {
          search: q,
          quickFilter: null,
          heroStatFilter: null,
          sort,
        })
      )
    })
  }, [navigate, searchInput, sort, setSearch, setSearchInput, setQuickFilterState, setHeroStatFilterState, setSearchSubmitKey])

  const handleBrowseJobs = useCallback(() => {
    startTransition(() => {
      navigate(
        buildBrowseUrl('/jobs', {
          quickFilter,
          sort,
          heroStatFilter,
          search: search || null,
        })
      )
    })
  }, [navigate, quickFilter, sort, heroStatFilter, search])

  return {
    setQuickFilter,
    setSort,
    setHeroStatFilter,
    clearSearch,
    handleSearch,
    handleBrowseJobs,
    searchSubmitKey,
  }
}

export type BrowseFilters = ReturnType<typeof useBrowseFilters>
