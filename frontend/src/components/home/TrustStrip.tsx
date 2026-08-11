import { useTranslation } from 'react-i18next'

type Badge = {
  key: string
  value: string
  labelKey: string
  defaultLabel: string
}

const BADGES: Badge[] = [
  { key: 'sources', value: '145+', labelKey: 'trust.sources', defaultLabel: 'Official portals scraped daily' },
  { key: 'jobs', value: '1,500+', labelKey: 'trust.jobs', defaultLabel: 'Live recruitment notifications' },
  { key: 'states', value: '28', labelKey: 'trust.states', defaultLabel: 'States & UTs covered' },
  { key: 'languages', value: '22', labelKey: 'trust.languages', defaultLabel: 'Languages supported' },
  { key: 'ingest', value: '8 AM IST', labelKey: 'trust.ingest', defaultLabel: 'Auto-sync daily' },
]

export default function TrustStrip() {
  const { t } = useTranslation()
  return (
    <div className="trust-strip" role="region" aria-label={t('trust.aria', { defaultValue: 'Site trust indicators' })}>
      {BADGES.map((b) => (
        <div key={b.key} className="trust-strip__badge">
          <strong>{b.value}</strong>
          <span>{t(b.labelKey, { defaultValue: b.defaultLabel })}</span>
        </div>
      ))}
    </div>
  )
}
