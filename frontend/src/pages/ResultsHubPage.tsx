import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Footer from '@/components/layout/Footer'
import RecruitmentEventsList from '@/components/hub/RecruitmentEventsList'
import OfficialHeadlinesSection from '@/components/home/OfficialHeadlinesSection'
import ResultsHubFilters from '@/components/home/ResultsHubFilters'
import AdSlot from '@/components/ads/AdSlot'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { RecruitmentEventType } from '@/lib/recruitmentEventsApi'
import type { CategoryId } from '@/data/categories'
import { getArchiveFileForTopic, getResultTopicByKey } from '@/data/resultTopics'
import { buildResultsHubQuery, parseResultsHubQuery } from '@/utils/browseRoutes'

const EVENT_TOPIC: Partial<Record<RecruitmentEventType, string>> = {
  result: 'sarkari-result',
  admit_card: 'admit-card',
  answer_key: 'answer-key',
}

type Props = {
  eventType: RecruitmentEventType
  pageTitle: string
  lead?: string
  topicKey?: string | null
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ResultsHubPage({
  eventType,
  pageTitle,
  lead,
  topicKey,
  onFooterLink,
}: Props) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => parseResultsHubQuery(searchParams.toString()), [searchParams])
  const resolvedTopic = topicKey ?? EVENT_TOPIC[eventType] ?? null
  const topicDef = getResultTopicByKey(resolvedTopic)
  const archiveFile = getArchiveFileForTopic(resolvedTopic)

  const patchQuery = useCallback(
    (patch: { stateId?: string | null; categoryId?: CategoryId | null }) => {
      const next = {
        stateId: patch.stateId === undefined ? query.stateId : patch.stateId,
        categoryId: patch.categoryId === undefined ? query.categoryId : patch.categoryId,
      }
      setSearchParams(buildResultsHubQuery(next).replace(/^\?/, ''), { replace: true })
    },
    [query.categoryId, query.stateId, setSearchParams],
  )

  return (
    <div className="hub-page results-hub-page">
      <h1>{pageTitle}</h1>
      {lead && <p className="hub-page__lead">{lead}</p>}
      {topicDef ? (
        <p className="hub-page__lead">
          {t('headlines.archive', { defaultValue: 'Official archive' })}
          {archiveFile ? ` · ${archiveFile}` : ''}
        </p>
      ) : null}

      {resolvedTopic ? (
        <>
          <ResultsHubFilters
            topicKey={resolvedTopic}
            stateId={query.stateId}
            categoryId={query.categoryId}
            onStateSelect={(stateId) => patchQuery({ stateId })}
            onCategorySelect={(categoryId) => patchQuery({ categoryId })}
          />
          <OfficialHeadlinesSection
            topicKey={resolvedTopic}
            stateId={query.stateId}
            categoryId={query.categoryId}
            resultsHubMode
            viewMode="table"
          />
        </>
      ) : null}

      <section className="hub-page__events" aria-label={t('events.linkedRecruitments', { defaultValue: 'Linked recruitments' })}>
        <h2 className="hub-page__events-title">
          {t('events.linkedRecruitments', { defaultValue: 'Linked recruitments' })}
        </h2>
        <RecruitmentEventsList
          eventType={eventType}
          title={pageTitle}
          emptyMessage={t('events.emptyResults', {
            defaultValue: 'No entries yet. New records appear here as scrapers detect them.',
          })}
        />
      </section>
      <AdSlot slot="results-hub" format="horizontal" />
      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
