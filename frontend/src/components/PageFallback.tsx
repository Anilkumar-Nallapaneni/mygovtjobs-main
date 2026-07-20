import { useTranslation } from 'react-i18next'

type PageFallbackProps = {
  /** Extra class — Account/JobDetail use `page-fallback`; route Suspense uses none. */
  className?: string
}

/** Lightweight placeholder while a lazy route or page chunk loads. */
export default function PageFallback({ className }: PageFallbackProps) {
  const { t } = useTranslation()
  const classes = ['route-page-fallback', className].filter(Boolean).join(' ')
  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      <div className="route-page-fallback__spinner" aria-hidden />
      <span className="route-page-fallback__label">
        {t('jobsStatus.loading', { defaultValue: 'Loading…' })}
      </span>
    </div>
  )
}
