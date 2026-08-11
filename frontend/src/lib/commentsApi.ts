import { getSupabase } from '@/lib/supabase'

export type JobCommentRow = {
  id: string
  job_id: string
  job_slug: string
  user_id: string | null
  display_name: string | null
  body: string
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  created_at: string
}

export async function listApprovedComments(jobId: string): Promise<JobCommentRow[]> {
  const supabase = await getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('job_comments')
    .select('id, job_id, job_slug, user_id, display_name, body, status, created_at')
    .eq('job_id', jobId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    console.warn('[comments] list failed', error.message)
    return []
  }
  return (data as JobCommentRow[]) ?? []
}

export async function submitComment(
  userId: string,
  jobId: string,
  jobSlug: string,
  displayName: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, error: 'unavailable' }
  const trimmed = body.trim()
  if (trimmed.length < 3) return { ok: false, error: 'too_short' }
  if (trimmed.length > 2000) return { ok: false, error: 'too_long' }
  const { error } = await supabase.from('job_comments').insert({
    user_id: userId,
    job_id: jobId,
    job_slug: jobSlug,
    display_name: displayName || null,
    body: trimmed,
    status: 'pending',
  })
  if (error) {
    console.warn('[comments] insert failed', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
