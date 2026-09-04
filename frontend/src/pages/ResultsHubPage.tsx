import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Footer from '@/components/layout/Footer'
import RecruitmentEventsList from '@/components/hub/RecruitmentEventsList'
import AdSlot from '@/components/ads/AdSlot'
import { pageTitle } from '@/data/siteMeta'
import { applyBrowseSeo } from '@/utils/browseSeo'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'
import type { RecruitmentEventType } from '@/lib/recruitmentEventsApi'

type Props = {
  eventType: RecruitmentEventType
  pageTitle: string
  lead?: string
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ResultsHubPage({ eventType, pageTitle: heading, lead, onFooterLink }: Props) {
  const { t } = useTranslation()
  const location = useLocation()

  useEffect(() => {
    return applyBrowseSeo(location.pathname, location.search)
  }, [location.pathname, location.search])

  useEffect(() => {
    document.title = pageTitle(heading)
  }, [heading])

  return (
    <div className="hub-page">
      <h1>{heading}</h1>
      {lead && <p className="hub-page__lead">{lead}</p>}
      <RecruitmentEventsList
        eventType={eventType}
        title={heading}
        emptyMessage={t('events.emptyResults', {
          defaultValue: 'No entries yet. New records appear here as scrapers detect them.',
        })}
      />
      <AdSlot slot="results-hub" format="horizontal" />
      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
