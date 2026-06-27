import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listMyAlertSubscriptions, unsubscribeAlert, type AlertSubscriptionRow } from '@/lib/alertsApi'

type AccountAlertsPanelProps = {
  userId: string
}

export default function AccountAlertsPanel({ userId }: AccountAlertsPanelProps) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<AlertSubscriptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const data = await listMyAlertSubscriptions(userId)
    setRows(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const onUnsubscribe = async (row: AlertSubscriptionRow) => {
    const result = await unsubscribeAlert(row)
    if (result.ok) {
      setRows((prev) => prev.filter((r) => r.id !== row.id))
    } else {
      setError(result.error || t('account.alertsUnsubscribeFailed', { defaultValue: 'Could not unsubscribe' }))
    }
  }

  return (
    <section className="account-page__section">
      <h2>{t('account.alertsTitle', { defaultValue: 'Job alerts' })}</h2>
      <p className="account-page__lead">
        {t('account.alertsLead', {
          defaultValue: 'Manage channels you subscribed to while signed in. Subscribe to more from the homepage.',
        })}
      </p>
      {loading && <p>{t('jobsStatus.loading', { defaultValue: 'Loading…' })}</p>}
      {error && (
        <p className="account-page__error" role="alert">
          {error}
        </p>
      )}
      {!loading && rows.length === 0 && (
        <p>{t('account.alertsEmpty', { defaultValue: 'No active alert subscriptions linked to this account.' })}</p>
      )}
      <ul className="account-alerts-list">
        {rows.map((row) => (
          <li key={row.id} className="account-alerts-list__item">
            <div>
              <strong>{t(`alert.${row.channel}`, { defaultValue: row.channel })}</strong>
              <span className="account-alerts-list__address">{row.channel_address}</span>
              {(row.state_codes?.length || row.categories?.length) ? (
                <span className="account-alerts-list__filters">
                  {[...(row.state_codes || []), ...(row.categories || [])].join(', ')}
                </span>
              ) : null}
            </div>
            <button type="button" className="account-alerts-list__unsub" onClick={() => onUnsubscribe(row)}>
              {t('account.alertsUnsubscribe', { defaultValue: 'Unsubscribe' })}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
