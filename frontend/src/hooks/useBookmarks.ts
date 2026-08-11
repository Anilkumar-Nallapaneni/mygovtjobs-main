import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { addBookmark, listBookmarks, removeBookmark, type BookmarkRow } from '@/lib/bookmarksApi'

type UseBookmarks = {
  bookmarks: BookmarkRow[]
  bookmarkedJobIds: Set<string>
  loading: boolean
  isBookmarked: (jobId: string) => boolean
  toggle: (jobId: string, jobSlug: string) => Promise<{ ok: boolean; error?: string }>
  refresh: () => Promise<void>
}

export function useBookmarks(): UseBookmarks {
  const { user, configured } = useAuth()
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!configured || !user) {
      setBookmarks([])
      return
    }
    setLoading(true)
    const rows = await listBookmarks(user.id)
    setBookmarks(rows)
    setLoading(false)
  }, [configured, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const bookmarkedJobIds = useMemo(
    () => new Set(bookmarks.map((bookmark) => bookmark.job_id)),
    [bookmarks]
  )

  const isBookmarked = useCallback(
    (jobId: string) => bookmarkedJobIds.has(jobId),
    [bookmarkedJobIds]
  )

  const toggle = useCallback(
    async (jobId: string, jobSlug: string) => {
      if (!user) return { ok: false as const, error: 'not_signed_in' }
      if (bookmarkedJobIds.has(jobId)) {
        setBookmarks((prev) => prev.filter((b) => b.job_id !== jobId))
        const res = await removeBookmark(user.id, jobId)
        if (!res.ok) void refresh()
        return res
      }
      const optimistic: BookmarkRow = {
        id: `optimistic-${jobId}`,
        user_id: user.id,
        job_id: jobId,
        job_slug: jobSlug,
        created_at: new Date().toISOString(),
      }
      setBookmarks((prev) => [optimistic, ...prev])
      const res = await addBookmark(user.id, jobId, jobSlug)
      if (!res.ok) void refresh()
      return res
    },
    [bookmarkedJobIds, refresh, user]
  )

  return { bookmarks, bookmarkedJobIds, loading, isBookmarked, toggle, refresh }
}
