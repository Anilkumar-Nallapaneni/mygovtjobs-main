import { getSupabase } from '@/lib/supabase'

export type BookmarkRow = {
  id: string
  user_id: string
  job_id: string
  job_slug: string
  created_at: string
}

export async function listBookmarks(userId: string): Promise<BookmarkRow[]> {
  const supabase = await getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id, user_id, job_id, job_slug, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[bookmarks] list failed', error.message)
    return []
  }
  return (data as BookmarkRow[]) ?? []
}

export async function addBookmark(userId: string, jobId: string, jobSlug: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, error: 'unavailable' }
  const { error } = await supabase
    .from('bookmarks')
    .insert({ user_id: userId, job_id: jobId, job_slug: jobSlug })
  if (error) {
    if (error.code === '23505') return { ok: true }
    console.warn('[bookmarks] add failed', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function removeBookmark(userId: string, jobId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, error: 'unavailable' }
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('job_id', jobId)
  if (error) {
    console.warn('[bookmarks] remove failed', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
