import { useTranslation } from 'react-i18next'
import Footer from '@/components/layout/Footer'
import RecruitmentEventsList from '@/components/hub/RecruitmentEventsList'
import AdSlot from '@/components/ads/AdSlot'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { RecruitmentEventType } from '@/lib/recruitmentEventsApi'

type Props = {
  eventType: RecruitmentEventType
  pageTitle: string
  lead?: string
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ResultsHubPage({ eventType, pageTitle, lead, onFooterLink }: Props) {
  const { t } = useTranslation()
  return (
    <div className="hub-page">
      <h1>{pageTitle}</h1>
      {lead && <p className="hub-page__lead">{lead}</p>}
      <RecruitmentEventsList
        eventType={eventType}
        title={pageTitle}
        emptyMessage={t('events.emptyResults', {
          defaultValue: 'No entries yet. New records appear here as scrapers detect them.',
        })}
      />
      <AdSlot slot="results-hub" format="horizontal" />
      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
