import { startTransition, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getResultTopicByKey, resultTopicRoutePath } from '@/data/resultTopics'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { BrowseStateCore } from '@/hooks/browse/useBrowseStateCore'
import {
  scrollToBrowseSection,
  scrollToHeadlines,
  scrollToMainJobs,
  scrollToMapPanel,
  scrollWindowToTop,
} from '@/hooks/browse/browseScrollHelpers'
import {
  buildBrowsePath,
  buildBrowseUrl,
  buildResultsHubUrl,
  isValidCategoryId,
  LATEST_NOTIFICATIONS_PATH,
} from '@/utils/browseRoutes'

export function useBrowseFooterNavigation(core: BrowseStateCore) {
  const navigate = useNavigate()
  const {
    quickFilter,
    sort,
    setSortState,
    heroStatFilter,
    search,
    setActiveCat,
    setHeadlinesTopicKey,
  } = core

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
          scrollToMapPanel()
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
          scrollToMainJobs()
          return
        }

        if (target.view === 'admit-card') {
          navigate(buildResultsHubUrl(resultTopicRoutePath('admit-card')))
          setHeadlinesTopicKey('admit-card')
          scrollToHeadlines()
          return
        }

        if (target.topicKey && getResultTopicByKey(target.topicKey)) {
          navigate(buildResultsHubUrl(resultTopicRoutePath(target.topicKey)))
          setHeadlinesTopicKey(target.topicKey)
          scrollToHeadlines()
          return
        }

        if (target.view === 'results') {
          navigate(buildResultsHubUrl(resultTopicRoutePath('sarkari-result')))
          setHeadlinesTopicKey('sarkari-result')
          scrollToHeadlines()
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
          scrollToBrowseSection(target.section || 'main-jobs')
          return
        }

        if (target.view === 'latest-notifications' || target.topicKey === 'latest') {
          navigate(LATEST_NOTIFICATIONS_PATH)
          scrollWindowToTop('smooth')
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
        if (target.section) scrollToBrowseSection(target.section)
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
    handleFooterLink,
  }
}
