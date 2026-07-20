import { startTransition, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { resultTopicRoutePath } from '@/data/resultTopics'
import type { BrowseStateCore } from '@/hooks/browse/useBrowseStateCore'
import {
  scrollToAlertDelayed,
  scrollToHeadlinesDelayed,
} from '@/hooks/browse/browseScrollHelpers'
import {
  buildBrowsePath,
  buildBrowseUrl,
  buildResultsHubUrl,
  parseResultsHubQuery,
} from '@/utils/browseRoutes'

type HeadlinesNavigationDeps = {
  resetToHome: () => void
}

export function useBrowseHeadlinesNavigation(
  core: BrowseStateCore,
  { resetToHome }: HeadlinesNavigationDeps
) {
  const navigate = useNavigate()
  const {
    location,
    isResultsHubRoute,
    sort,
    search,
    setSelectedState,
    setActiveCat,
    setQuickFilterState,
    setHeroStatFilterState,
    setHeadlinesTopicKey,
  } = core

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
      scrollToHeadlinesDelayed()
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
          scrollToAlertDelayed()
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

  return {
    navigateToHeadlinesHub,
    handleNavigate,
  }
}
