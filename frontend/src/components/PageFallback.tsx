import { useTranslation } from 'react-i18next'

export default function PageFallback() {
  const { t } = useTranslation()
  return (
    <div className="page-fallback">
      {t('jobsStatus.loading', { defaultValue: 'Loading…' })}
    </div>
  )
}
