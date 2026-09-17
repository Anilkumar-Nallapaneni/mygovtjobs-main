import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchAlertChannelStatus,
  listMyAlertSubscriptions,
  unsubscribeAlert,
  type AlertChannelStatus,
  type AlertSubscriptionRow,
} from '@/lib/alertsApi'

type AccountAlertsPanelProps = {
  userId: string
}

function formatWhen(value: string | null | undefined, locale: string): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(parsed)
}

function deliveryStatus(
  row: AlertSubscriptionRow,
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string
): string {
  const when = formatWhen(row.last_delivered_at, locale)
  if (when) {
    return t('account.alertsDeliveredAt', {
      when,
      count: row.delivery_count || 1,
      defaultValue: 'Last delivered {{when}} IST ({{count}} sent)',
    })
  }
  return t('account.alertsNeverDelivered', {
    defaultValue: 'No delivery yet — you will see status here after the next matching live job.',
  })
}

export default function AccountAlertsPanel({ userId }: AccountAlertsPanelProps) {
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState<AlertSubscriptionRow[]>([])
  const [channels, setChannels] = useState<AlertChannelStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const locale = i18n.language || 'en-IN'

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [data, status] = await Promise.all([listMyAlertSubscriptions(userId), fetchAlertChannelStatus()])
    setRows(data)
    setChannels(status)
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
      setError(t('account.alertsUnsubscribeFailed', { defaultValue: 'Could not unsubscribe. Please try again.' }))
    }
  }

  const lastSite = formatWhen(channels?.last_site_delivery_at, locale)

  return (
    <section className="account-page__section">
      <h2>{t('account.alertsTitle', { defaultValue: 'Job alerts' })}</h2>
      <p className="account-page__lead">
        {t('account.alertsLead', {
          defaultValue: 'Manage channels you subscribed to while signed in. Subscribe to more from the homepage.',
        })}
      </p>
      {channels ? (
        <ul className="account-channel-status" aria-label={t('account.channelStatus', { defaultValue: 'Delivery channels' })}>
          <li>
            {t('account.channelEmail', { defaultValue: 'Email' })}:{' '}
            {channels.email
              ? t('account.channelReady', { defaultValue: 'ready' })
              : t('account.channelOff', { defaultValue: 'not configured' })}
          </li>
          <li>
            {t('account.channelPush', { defaultValue: 'Web push' })}:{' '}
            {channels.push
              ? t('account.channelReady', { defaultValue: 'ready' })
              : t('account.channelOff', { defaultValue: 'not configured' })}
          </li>
          <li>
            {t('account.channelTelegram', { defaultValue: 'Telegram' })}:{' '}
            {channels.telegram
              ? t('account.channelReady', { defaultValue: 'ready' })
              : t('account.channelOff', { defaultValue: 'not configured' })}
          </li>
          {lastSite ? (
            <li>
              {t('account.lastSiteDelivery', {
                when: lastSite,
                defaultValue: 'Last site-wide delivery {{when}} IST',
              })}
            </li>
          ) : null}
        </ul>
      ) : null}
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
              <span className="account-alerts-list__status">{deliveryStatus(row, t, locale)}</span>
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
