type TranslateFn = (key: string, opts?: Record<string, unknown>) => string

export function LatestNotificationsLoadingState({ t }: { t: TranslateFn }) {
  return (
    <div className="latest-notif" role="status">
      <p className="latest-notif__status">
        {t('latestNotif.loading', { defaultValue: 'Loading latest notifications…' })}
      </p>
    </div>
  )
}

export function LatestNotificationsEmptyState({ t }: { t: TranslateFn }) {
  return (
    <div className="latest-notif">
      <p className="latest-notif__status">
        {t('latestNotif.empty', {
          defaultValue: 'No official listings available right now. Please check back soon.',
        })}
      </p>
    </div>
  )
}

export function LatestNotificationsFilteredEmptyState({ t }: { t: TranslateFn }) {
  return (
    <p className="latest-notif__status">
      {t('latestNotif.emptyFilter', {
        defaultValue: 'No notifications match the current filters.',
      })}
    </p>
  )
}
