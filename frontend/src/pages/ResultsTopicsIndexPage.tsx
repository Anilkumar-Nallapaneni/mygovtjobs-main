import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import { RESULT_TOPICS } from '@/data/resultTopics'
import { useOfficialTopicCounts } from '@/hooks/useOfficialTopicCounts'
import { applyBrowseSeo } from '@/utils/browseSeo'
import { RESULTS_TOPICS_INDEX_PATH } from '@/utils/browseRoutes'
import { resultTopicRoutePath } from '@/data/resultTopics'
import { numberLocale } from '@/utils/formatLocale'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

type ResultsTopicsIndexPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ResultsTopicsIndexPage({ onFooterLink }: ResultsTopicsIndexPageProps) {
  const { t, i18n } = useTranslation()
  const locale = numberLocale(i18n.language)
  const countsByTopic = useOfficialTopicCounts()

  useEffect(() => {
    return applyBrowseSeo(RESULTS_TOPICS_INDEX_PATH)
  }, [])

  useEffect(() => {
    document.title = `${t('results.indexTitle')} | My Govt Jobs`
  }, [t])

  return (
    <div className="static-page browse-index-page">
      <header className="static-page__header">
        <Link to="/" className="static-page__back">
          {t('jobDetail.back', { defaultValue: 'Back' })}
        </Link>
        <h1 className="static-page__title">{t('results.indexTitle')}</h1>
        <p className="static-page__lede">{t('results.indexDesc')}</p>
      </header>

      <div className="browse-index-grid">
        {RESULT_TOPICS.map((topic) => {
          const count = countsByTopic.get(topic.topicKey) ?? 0
          return (
            <Link
              key={topic.topicKey}
              to={resultTopicRoutePath(topic.topicKey)}
              className="browse-index-card"
            >
              <h2 className="browse-index-card__title">
                {t(`sidebar.${topic.labelKey}`, { defaultValue: topic.title })}
              </h2>
              <p className="browse-index-card__meta">
                {t('results.cardMeta', {
                  count: count.toLocaleString(locale),
                  defaultValue: '{{count}} official updates',
                })}
              </p>
            </Link>
          )
        })}
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
