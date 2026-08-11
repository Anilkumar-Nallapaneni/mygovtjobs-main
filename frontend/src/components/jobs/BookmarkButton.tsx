import { useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useBookmarks } from '@/hooks/useBookmarks'

type BookmarkButtonProps = {
  jobId: string
  jobSlug: string
  compact?: boolean
}

export default function BookmarkButton({ jobId, jobSlug, compact = false }: BookmarkButtonProps) {
  const { t } = useTranslation()
  const { user, configured } = useAuth()
  const { isBookmarked, toggle } = useBookmarks()
  const [busy, setBusy] = useState(false)

  if (!configured) return null

  const saved = isBookmarked(jobId)

  const handleClick = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      window.location.assign('/account')
      return
    }
    setBusy(true)
    await toggle(jobId, jobSlug)
    setBusy(false)
  }

  const label = saved
    ? t('bookmarks.remove', { defaultValue: 'Saved' })
    : t('bookmarks.add', { defaultValue: 'Save' })

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={label}
      className={`bookmark-button${saved ? ' bookmark-button--saved' : ''}${compact ? ' bookmark-button--compact' : ''}`}
    >
      <span aria-hidden="true" className="bookmark-button__icon">
        {saved ? '★' : '☆'}
      </span>
      {!compact && <span className="bookmark-button__label">{label}</span>}
    </button>
  )
}
