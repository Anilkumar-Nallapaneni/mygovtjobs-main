import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TurnstileWidget from '@/components/TurnstileWidget'
import { isTurnstileConfigured, turnstileHeaders } from '@/lib/turnstile'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const REASONS = [
  { id: 'expired', labelKey: 'jobReport.reasonExpired' },
  { id: 'wrong_deadline', labelKey: 'jobReport.reasonWrongDeadline' },
  { id: 'broken_link', labelKey: 'jobReport.reasonBrokenLink' },
  { id: 'wrong_vacancy', labelKey: 'jobReport.reasonWrongVacancy' },
  { id: 'duplicate', labelKey: 'jobReport.reasonDuplicate' },
  { id: 'not_recruitment', labelKey: 'jobReport.reasonNotRecruitment' },
  { id: 'suspicious_source', labelKey: 'jobReport.reasonSuspiciousSource' },
] as const

type ReportJobButtonProps = {
  jobId: string
  jobTitle: string
}

export default function ReportJobButton({ jobId, jobTitle }: ReportJobButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>(REASONS[0].id)
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  if (!API_BASE) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (isTurnstileConfigured() && !turnstileToken?.trim()) {
      setError(
        t('jobReport.turnstileRequired', {
          defaultValue: 'Please complete the security check.',
        })
      )
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE}/api/job-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...turnstileHeaders(turnstileToken),
        },
        body: JSON.stringify({
          job_id: jobId,
          reason,
          description: description.trim(),
          reporter_email: email.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.warn('[jobReport] submit failed', res.status, text.slice(0, 200))
        throw new Error('SUBMIT_FAILED')
      }
      setMessage(
        t('jobReport.success', {
          defaultValue: 'Thank you — we will review this listing.',
        })
      )
      setOpen(false)
      setDescription('')
      setTurnstileToken(null)
    } catch (err) {
      console.warn('[jobReport]', err)
      setError(t('jobReport.error', { defaultValue: 'Could not submit report.' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="job-report">
      {!open ? (
        <button type="button" className="job-report__toggle" onClick={() => setOpen(true)}>
          {t('jobReport.button', { defaultValue: 'Report incorrect job' })}
        </button>
      ) : (
        <form className="job-report__form" onSubmit={submit}>
          <p className="job-report__title">
            {t('jobReport.title', {
              job: jobTitle,
              defaultValue: `Report: ${jobTitle}`,
            })}
          </p>
          <label className="job-report__label">
            {t('jobReport.reasonLabel', { defaultValue: 'Reason' })}
            <select value={reason} onChange={(ev) => setReason(ev.target.value)}>
              {REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {t(r.labelKey, { defaultValue: r.id.replace(/_/g, ' ') })}
                </option>
              ))}
            </select>
          </label>
          <label className="job-report__label">
            {t('jobReport.detailsLabel', { defaultValue: 'Details (optional)' })}
            <textarea
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              rows={3}
              maxLength={2000}
            />
          </label>
          <label className="job-report__label">
            {t('jobReport.emailLabel', { defaultValue: 'Email (optional)' })}
            <input type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} />
          </label>
          <TurnstileWidget onToken={setTurnstileToken} className="job-report__turnstile" />
          <div className="job-report__actions">
            <button type="submit" disabled={busy}>
              {busy
                ? t('jobReport.sending', { defaultValue: 'Sending…' })
                : t('jobReport.submit', { defaultValue: 'Submit report' })}
            </button>
            <button type="button" className="job-report__cancel" onClick={() => setOpen(false)}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}
      {message ? <p className="job-report__success">{message}</p> : null}
      {error ? <p className="job-report__error">{error}</p> : null}
    </div>
  )
}
