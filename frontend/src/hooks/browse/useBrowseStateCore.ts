import { useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { CategoryId } from '@/data/categories'
import type { HeroStatFilterKey, HomeSortKey } from '@/utils/homePageFilters'
import {
  ALL_INDIA_JOBS_PATH,
  LATEST_NOTIFICATIONS_PATH,
  parseBrowsePath,
  parseBrowseQuery,
} from '@/utils/browseRoutes'
import { isResultHubPath } from '@/data/resultTopics'
import { isBrowseRoutePath } from '@/hooks/browseStateTypes'

export function useBrowseStateCore() {
  const location = useLocation()
  const pathname = location.pathname
  const urlQuery = parseBrowseQuery(location.search)

  const isJobDetailRoute =
    /^\/jobs\/[^/]+/.test(pathname) &&
    pathname !== LATEST_NOTIFICATIONS_PATH &&
    pathname !== ALL_INDIA_JOBS_PATH
  const isLatestNotificationsRoute = pathname === LATEST_NOTIFICATIONS_PATH
  const isResultsHubRoute = isResultHubPath(pathname)
  const isBrowseRoute = isBrowseRoutePath(pathname)

  const view = useMemo(() => {
    if (isJobDetailRoute) return 'jobs'
    if (isLatestNotificationsRoute) return 'latest-notifications'
    return parseBrowsePath(pathname).view
  }, [pathname, isJobDetailRoute, isLatestNotificationsRoute])

  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [activeCat, setActiveCat] = useState<CategoryId | null>(null)
  const [quickFilter, setQuickFilterState] = useState<string | null>(urlQuery.quickFilter)
  const [sort, setSortState] = useState<HomeSortKey>(urlQuery.sort)
  const [heroStatFilter, setHeroStatFilterState] = useState<HeroStatFilterKey | null>(
    urlQuery.heroStatFilter
  )
  const [search, setSearch] = useState(urlQuery.search || '')
  const [searchInput, setSearchInput] = useState(urlQuery.search || '')
  const [searchSubmitKey, setSearchSubmitKey] = useState(0)
  const [headlinesTopicKey, setHeadlinesTopicKey] = useState<string | null>(null)
  const [qualificationSlug, setQualificationSlug] = useState<string | null>(null)
  const [professionSlug, setProfessionSlug] = useState<string | null>(null)
  const [orgSlug, setOrgSlug] = useState<string | null>(null)
  const [allIndiaBrowse, setAllIndiaBrowse] = useState(false)
  const prevBrowsePathRef = useRef('')

  return {
    location,
    pathname,
    urlQuery,
    isJobDetailRoute,
    isLatestNotificationsRoute,
    isResultsHubRoute,
    isBrowseRoute,
    view,
    selectedState,
    setSelectedState,
    activeCat,
    setActiveCat,
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
    headlinesTopicKey,
    setHeadlinesTopicKey,
    qualificationSlug,
    setQualificationSlug,
    professionSlug,
    setProfessionSlug,
    orgSlug,
    setOrgSlug,
    allIndiaBrowse,
    setAllIndiaBrowse,
    prevBrowsePathRef,
  }
}

export type BrowseStateCore = ReturnType<typeof useBrowseStateCore>
