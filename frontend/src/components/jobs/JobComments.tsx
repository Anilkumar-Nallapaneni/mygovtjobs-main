import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { listApprovedComments, submitComment, type JobCommentRow } from '@/lib/commentsApi'

type Props = {
  jobId: string
  jobSlug: string
}

export default function JobComments({ jobId, jobSlug }: Props) {
  const { t } = useTranslation()
  const { configured, user, profile } = useAuth()
  const [comments, setComments] = useState<JobCommentRow[]>([])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const rows = await listApprovedComments(jobId)
    setComments(rows)
  }, [jobId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!configured) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) {
      window.location.assign('/account')
      return
    }
    setBusy(true)
    setNote(null)
    const result = await submitComment(
      user.id,
      jobId,
      jobSlug,
      profile?.display_name || user.email || 'Anonymous',
      body
    )
    setBusy(false)
    if (result.ok) {
      setBody('')
      setNote(t('comments.pending', { defaultValue: 'Comment submitted — will appear after moderation.' }))
    } else if (result.error === 'too_short') {
      setNote(t('comments.tooShort', { defaultValue: 'Comment must be at least 3 characters.' }))
    } else if (result.error === 'too_long') {
      setNote(t('comments.tooLong', { defaultValue: 'Comment too long (max 2000 characters).' }))
    } else {
      setNote(t('comments.failed', { defaultValue: 'Could not submit comment.' }))
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>
        {t('comments.title', { defaultValue: 'Discussion' })}
      </h2>

      {comments.length === 0 ? (
        <p style={{ color: 'var(--ds-muted)' }}>
          {t('comments.empty', { defaultValue: 'No comments yet. Be the first to share thoughts.' })}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {comments.map((c) => (
            <li
              key={c.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                {c.display_name || 'Anonymous'}
                <span style={{ color: 'var(--ds-muted)', fontWeight: 400, marginLeft: 8, fontSize: 11 }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}>{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('comments.placeholder', { defaultValue: 'Share a helpful comment (moderated).' })}
            rows={3}
            required
            maxLength={2000}
            style={{
              width: '100%',
              padding: 8,
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 8,
              fontFamily: 'inherit',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--ds-muted)' }}>
              {body.length}/2000
            </span>
            <button
              type="submit"
              disabled={busy || body.trim().length < 3}
              className="account-form__submit"
              style={{ padding: '6px 16px', fontSize: 13 }}
            >
              {busy ? '…' : t('comments.submit', { defaultValue: 'Post comment' })}
            </button>
          </div>
        </form>
      ) : (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--ds-muted)' }}>
          <a href="/account">{t('comments.signInToPost', { defaultValue: 'Sign in to comment' })}</a>
        </p>
      )}

      {note && (
        <p role="status" style={{ marginTop: 8, fontSize: 13, color: 'var(--ds-accent)' }}>
          {note}
        </p>
      )}
    </section>
  )
}
