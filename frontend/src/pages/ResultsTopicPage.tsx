import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import OfficialHeadlinesSection from '@/components/home/OfficialHeadlinesSection'
import NotFoundPage from '@/pages/NotFoundPage'
import { pageTitle } from '@/data/siteMeta'
import {
  RESULTS_TOPICS_INDEX_PATH,
  getResultTopicBySlug,
  isValidResultTopicSlug,
} from '@/data/resultTopics'
import { applyBrowseSeo } from '@/utils/browseSeo'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

type ResultsTopicPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ResultsTopicPage({ onFooterLink }: ResultsTopicPageProps) {
  const { topicSlug: rawSlug } = useParams<{ topicSlug: string }>()
  const topicSlug = decodeURIComponent(rawSlug || '').toLowerCase()
  const topic = getResultTopicBySlug(topicSlug)
  const { t } = useTranslation()

  useEffect(() => {
    if (!topic) return undefined
    return applyBrowseSeo(`/results/${topic.slug}`)
  }, [topic])

  useEffect(() => {
    if (!topic) return
    document.title = pageTitle(topic.title)
  }, [topic])

  if (!isValidResultTopicSlug(topicSlug) || !topic) {
    return <NotFoundPage onFooterLink={onFooterLink} />
  }

  return (
    <div className="hub-page results-topic-page">
      <header className="results-hub-page__header">
        <Link to={RESULTS_TOPICS_INDEX_PATH} className="results-hub-page__back">
          {t('results.allTopics', { defaultValue: 'All exam updates' })}
        </Link>
        <h1 className="results-hub-page__title">{topic.title}</h1>
        <p className="results-hub-page__desc">{topic.seoDescription}</p>
      </header>
      <OfficialHeadlinesSection topicKey={topic.topicKey} resultsHubMode />
      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
