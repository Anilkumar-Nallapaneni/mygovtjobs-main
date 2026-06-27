import CategoryGrid from '@/components/jobs/CategoryGrid'
import StateGrid from '@/components/jobs/StateGrid'
import { useBrowseContext } from '@/context/BrowseContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { computeJobAggregates } from '@/utils/jobAggregates'
import { useTranslation } from 'react-i18next'

type SectorBrowserProps = {
  stateCounts: ReturnType<typeof computeJobAggregates>['stateCounts']
  categoryCounts: ReturnType<typeof computeJobAggregates>['categoryCounts']
  loading?: boolean
}

export default function SectorBrowser({
  stateCounts,
  categoryCounts,
  loading = false,
}: SectorBrowserProps) {
  const { t } = useTranslation()
  const browse = useBrowseContext()
  const isCollapsible = useMediaQuery('(max-width: 768px)')

  const panels = (
    <>
      <StateGrid
        selected={browse.selectedState}
        onSelect={browse.handleStateSelect}
        onAllIndiaBrowse={browse.handleAllIndiaBrowse}
        stateCounts={stateCounts}
        loading={loading}
      />
      <CategoryGrid
        activeCat={browse.activeCat}
        onSelectCategory={browse.handleCategorySelect}
        counts={categoryCounts}
        loading={loading}
      />
    </>
  )

  if (isCollapsible) {
    return (
      <details id="browse-states" className="app-sector-browser app-sector-browser--collapsible">
        <summary className="app-sector-browser__toggle">
          {t('browse.sectorBrowserToggle', { defaultValue: 'Browse by state & sector' })}
        </summary>
        <div className="app-sector-browser__panels">{panels}</div>
      </details>
    )
  }

  return (
    <div id="browse-states" className="app-sector-browser">
      {panels}
    </div>
  )
}
