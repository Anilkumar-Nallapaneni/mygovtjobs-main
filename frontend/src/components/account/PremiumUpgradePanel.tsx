import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchBillingConfig,
  openPremiumCheckout,
  type BillingConfig,
} from '@/lib/billingApi'

type PremiumUpgradePanelProps = {
  accessToken: string | undefined
  userEmail: string
  subscriptionTier: string | null | undefined
  onUpgraded: () => void
}

export default function PremiumUpgradePanel({
  accessToken,
  userEmail,
  subscriptionTier,
  onUpgraded,
}: PremiumUpgradePanelProps) {
  const { t } = useTranslation()
  const [config, setConfig] = useState<BillingConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchBillingConfig().then(setConfig)
  }, [])

  const isPremium = subscriptionTier === 'premium'
  const amountInr = config?.amount_paise ? config.amount_paise / 100 : 99

  const onUpgrade = useCallback(async () => {
    if (!accessToken) {
      setError(t('account.premiumSignInRequired', { defaultValue: 'Sign in required for checkout.' }))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await openPremiumCheckout(
        accessToken,
        userEmail,
        () => {
          onUpgraded()
          setBusy(false)
        },
        (msg) => {
          console.warn('[PremiumUpgrade]', msg)
          setError(
            t('account.premiumError', {
              defaultValue: 'Could not start checkout. Please try again later.',
            })
          )
          setBusy(false)
        }
      )
      setBusy(false)
    } catch (err) {
      console.warn('[PremiumUpgrade]', err)
      setError(
        t('account.premiumError', {
          defaultValue: 'Could not start checkout. Please try again later.',
        })
      )
      setBusy(false)
    }
  }, [accessToken, userEmail, onUpgraded, t])

  if (!config?.enabled) {
    return (
      <section className="account-page__section account-premium account-premium--soon">
        <h2>{t('account.premiumTitle', { defaultValue: 'Premium' })}</h2>
        <p>
          {t('account.premiumSoon', {
            defaultValue: 'Instant job alerts and priority support — payments coming soon.',
          })}
        </p>
      </section>
    )
  }

  if (isPremium) {
    return (
      <section className="account-page__section account-premium account-premium--active">
        <h2>{t('account.premiumTitle', { defaultValue: 'Premium' })}</h2>
        <p className="account-premium__badge">
          {t('account.premiumActive', { defaultValue: 'You have Premium — instant alerts enabled.' })}
        </p>
      </section>
    )
  }

  return (
    <section className="account-page__section account-premium">
      <h2>{t('account.premiumTitle', { defaultValue: 'Premium' })}</h2>
      <p>
        {t('account.premiumPitch', {
          defaultValue:
            'Get instant email alerts when new jobs match your states, plus priority support.',
        })}
      </p>
      <ul className="account-premium__features">
        <li>{t('account.premiumFeature1', { defaultValue: 'Instant alert delivery (not daily digest)' })}</li>
        <li>{t('account.premiumFeature2', { defaultValue: 'Priority support' })}</li>
        <li>{t('account.premiumFeature3', { defaultValue: 'Supports official job portal mission' })}</li>
      </ul>
      <button type="button" className="account-form__submit" disabled={busy} onClick={() => void onUpgrade()}>
        {busy
          ? t('account.premiumProcessing', { defaultValue: 'Opening checkout…' })
          : t('account.premiumCta', { defaultValue: 'Upgrade — ₹{{amount}}/month', amount: amountInr })}
      </button>
      {error && <p className="account-page__error" role="alert">{error}</p>}
    </section>
  )
}
