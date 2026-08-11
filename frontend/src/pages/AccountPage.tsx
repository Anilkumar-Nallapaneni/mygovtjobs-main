import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { STATES } from '@/data/states'
import AccountAlertsPanel from '@/components/account/AccountAlertsPanel'
import PremiumUpgradePanel from '@/components/account/PremiumUpgradePanel'
import Footer from '@/components/layout/Footer'
import PageFallback from '@/components/PageFallback'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

type AccountPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function AccountPage({ onFooterLink }: AccountPageProps) {
  const { t, i18n } = useTranslation()
  const { configured, loading, user, profile, session, signInWithEmail, signInWithGoogle, signOut, updateProfile, reloadProfile } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)

  const favoriteStates = profile?.favorite_state_codes ?? []

  const onSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus(null)
    const result = await signInWithEmail(email)
    if (result.ok) {
      setStatus(t('account.magicLinkSent', { defaultValue: 'Check your email for a sign-in link.' }))
    } else if (result.error === 'email_required') {
      setError(t('account.emailRequired', { defaultValue: 'Please enter a valid email address.' }))
    } else {
      setError(t('account.signInFailed', { defaultValue: 'Sign-in failed. Please try again.' }))
    }
  }

  const onSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await updateProfile({
      display_name: displayName.trim() || null,
      preferred_language: i18n.resolvedLanguage || i18n.language,
    })
    setSaving(false)
    if (result.ok) {
      setStatus(t('account.profileSaved', { defaultValue: 'Profile saved.' }))
    } else {
      setError(t('account.saveFailed', { defaultValue: 'Could not save profile. Please try again.' }))
    }
  }

  const toggleState = async (stateId: string) => {
    const next = favoriteStates.includes(stateId)
      ? favoriteStates.filter((s) => s !== stateId)
      : [...favoriteStates, stateId]
    await updateProfile({ favorite_state_codes: next })
  }

  if (!configured) {
    return (
      <div className="static-page">
        <h1>{t('account.title', { defaultValue: 'Account' })}</h1>
        <p>
          {t('account.notConfigured', {
            defaultValue:
              'Sign-in is temporarily unavailable. You can still browse jobs without an account.',
          })}
        </p>
      </div>
    )
  }

  if (loading) {
    return <PageFallback className="page-fallback" />
  }

  if (!user) {
    return (
      <div className="static-page account-page">
        <h1>{t('account.signIn', { defaultValue: 'Sign in' })}</h1>
        <p className="account-page__lead">
          {t('account.signInLead', {
            defaultValue: 'Optional account to save alert preferences and favourite states. Browsing jobs does not require sign-in.',
          })}
        </p>
        <form className="account-form" onSubmit={onSignIn}>
          <label className="account-form__label" htmlFor="account-email">
            {t('account.email', { defaultValue: 'Email' })}
          </label>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="account-form__input"
          />
          <button type="submit" className="account-form__submit">
            {t('account.sendMagicLink', { defaultValue: 'Send magic link' })}
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
          <span style={{ color: 'var(--ds-muted)', fontSize: 12 }}>
            {t('account.or', { defaultValue: 'or' })}
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
        </div>
        <button
          type="button"
          className="account-form__submit"
          style={{ background: 'white', color: '#1c1c1e', border: '1px solid rgba(0,0,0,0.15)' }}
          onClick={async () => {
            setError(null)
            const res = await signInWithGoogle()
            if (!res.ok) {
              setError(t('account.googleFailed', { defaultValue: 'Google sign-in failed. Ensure Google provider is enabled in Supabase.' }))
            }
          }}
        >
          {t('account.continueWithGoogle', { defaultValue: 'Continue with Google' })}
        </button>
        {status && <p className="account-page__status" role="status">{status}</p>}
        {error && <p className="account-page__error" role="alert">{error}</p>}
        <Footer onFooterLink={onFooterLink} />
      </div>
    )
  }

  return (
    <div className="static-page account-page">
      <h1>{t('account.title', { defaultValue: 'Account' })}</h1>
      <p className="account-page__lead">{user.email}</p>

      <form className="account-form" onSubmit={onSaveProfile}>
        <label className="account-form__label" htmlFor="account-display-name">
          {t('account.displayName', { defaultValue: 'Display name' })}
        </label>
        <input
          id="account-display-name"
          type="text"
          value={displayName || profile?.display_name || ''}
          onChange={(e) => setDisplayName(e.target.value)}
          className="account-form__input"
        />
        <button type="submit" className="account-form__submit" disabled={saving}>
          {saving ? '…' : t('account.saveProfile', { defaultValue: 'Save profile' })}
        </button>
      </form>

      <section className="account-page__section">
        <h2>{t('account.favoriteStates', { defaultValue: 'Favourite states' })}</h2>
        <div className="account-state-chips">
          {STATES.slice(0, 12).map((state) => {
            const active = favoriteStates.includes(state.id)
            return (
              <button
                key={state.id}
                type="button"
                className={`account-state-chip${active ? ' account-state-chip--active' : ''}`}
                onClick={() => toggleState(state.id)}
              >
                {state.id}
              </button>
            )
          })}
        </div>
      </section>

      <PremiumUpgradePanel
        accessToken={session?.access_token}
        userEmail={user.email || ''}
        subscriptionTier={profile?.subscription_tier}
        onUpgraded={() => {
          void reloadProfile()
          setStatus(t('account.premiumWelcome', { defaultValue: 'Welcome to Premium!' }))
        }}
      />

      <AccountAlertsPanel userId={user.id} />

      {status && <p className="account-page__status" role="status">{status}</p>}
      {error && <p className="account-page__error" role="alert">{error}</p>}

      <button type="button" className="account-form__sign-out" onClick={() => signOut()}>
        {t('account.signOut', { defaultValue: 'Sign out' })}
      </button>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
