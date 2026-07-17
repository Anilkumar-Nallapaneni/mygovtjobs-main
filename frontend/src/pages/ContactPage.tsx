import { pageTitle } from '@/data/siteMeta'
import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from '@/components/layout/Footer'
import TurnstileWidget from '@/components/TurnstileWidget'
import { submitContactForm } from '@/lib/contactApi'
import { isTurnstileConfigured } from '@/lib/turnstile'
import { applyBrowseSeo } from '@/utils/browseSeo'
import type { FooterLinkTarget } from '@/hooks/browseStateTypes'

const CONTACT_PATH = '/contact'

type ContactPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void
}

export default function ContactPage({ onFooterLink }: ContactPageProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return applyBrowseSeo(CONTACT_PATH)
  }, [])

  useEffect(() => {
    document.title = pageTitle(t('contact.title'));
    const el = document.head.querySelector('meta[name="description"]')
    if (el) el.setAttribute('content', t('contact.description'))
  }, [t])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus(null)
    if (isTurnstileConfigured() && !turnstileToken?.trim()) {
      setError(
        t('contact.turnstileRequired', {
          defaultValue: 'Please complete the security check.',
        })
      )
      return
    }
    setLoading(true)
    const result = await submitContactForm({
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      message: message.trim(),
      website: honeypot,
      turnstileToken,
    })
    setLoading(false)
    if (result.ok === false) {
      setError(
        result.error === 'network'
          ? t('contact.offlineError', {
              defaultValue: 'Could not reach the server. Check your connection and try again.',
            })
          : t('contact.error')
      )
      return
    }
    setStatus(t('contact.success'))
    setName('')
    setEmail('')
    setMobile('')
    setMessage('')
    setTurnstileToken(null)
  }

  return (
    <div className="static-page contact-page">
      <header className="static-page__header">
        <Link to="/" className="static-page__back">
          {t('jobDetail.back', { defaultValue: 'Back' })}
        </Link>
        <h1 className="static-page__title">{t('contact.title')}</h1>
        <p className="static-page__lede">{t('contact.description')}</p>
      </header>

      <form className="contact-page__form" onSubmit={onSubmit} noValidate>
        <label className="contact-page__field">
          <span>{t('contact.name')}</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="contact-page__field">
          <span>{t('contact.email')}</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="contact-page__field">
          <span>{t('contact.mobile')}</span>
          <input
            type="tel"
            name="mobile"
            autoComplete="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </label>
        <label className="contact-page__field">
          <span>{t('contact.message')}</span>
          <textarea
            name="message"
            required
            minLength={10}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <input
          type="text"
          name="website"
          className="contact-page__honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
        <TurnstileWidget onToken={setTurnstileToken} className="contact-page__turnstile" />
        {error && (
          <p className="contact-page__feedback contact-page__feedback--error" role="alert">
            {error}
          </p>
        )}
        {status && (
          <p className="contact-page__feedback contact-page__feedback--ok" role="status">
            {status}
          </p>
        )}
        <button type="submit" className="contact-page__submit" disabled={loading}>
          {loading ? t('contact.sending') : t('contact.send')}
        </button>
        <p className="contact-page__fallback">
          {t('contact.fallback')}{' '}
          <a href="mailto:contact@livegovtjobs.com">contact@livegovtjobs.com</a>
        </p>
      </form>

      <Footer onFooterLink={onFooterLink} />
    </div>
  )
}
