import { getSupabase } from '@/lib/supabase'
import type { AlertSubscribePayload } from '@/lib/jobsApi'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export type AlertSubscriptionRow = {
  id: string
  channel: string
  channel_address: string
  state_codes: string[] | null
  categories: string[] | null
  qualification_tags: string[] | null
  is_active: boolean | null
  created_at?: string | null
}

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

export async function listMyAlertSubscriptions(
  userId: string
): Promise<AlertSubscriptionRow[]> {
  const supabase = await getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('alert_subscriptions')
    .select(
      'id, channel, channel_address, state_codes, categories, qualification_tags, is_active, created_at'
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[alertsApi] list failed', error.message)
    return []
  }
  return (data as AlertSubscriptionRow[]) ?? []
}

export async function unsubscribeAlert(
  row: Pick<AlertSubscriptionRow, 'id' | 'channel' | 'channel_address'>
): Promise<{ ok: boolean; error?: string }> {
  if (API_BASE) {
    try {
      const res = await fetch(apiUrl('/api/alerts/unsubscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      })
      if (res.ok) return { ok: true }
    } catch {
      /* fall through to Supabase */
    }
  }

  const supabase = await getSupabase()
  if (!supabase) {
    console.warn('[alertsApi] unsubscribe unavailable — auth not configured')
    return { ok: false, error: 'unavailable' }
  }

  const { error } = await supabase.from('alert_subscriptions').update({ is_active: false }).eq('id', row.id)

  if (error) {
    console.warn('[alertsApi] unsubscribe failed', error.message)
    return { ok: false, error: 'failed' }
  }
  return { ok: true }
}

export async function subscribeWithUser(
  payload: AlertSubscribePayload,
  userId?: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { subscribeToAlerts } = await import('@/lib/jobsApi')
  return subscribeToAlerts({ ...payload, user_id: userId })
}
