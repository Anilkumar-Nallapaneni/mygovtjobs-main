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
  last_delivered_at?: string | null
  delivery_count?: number
}

export type AlertChannelStatus = {
  email: boolean
  telegram: boolean
  whatsapp: boolean
  push: boolean
  last_site_delivery_at: string | null
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
  const rows = (data as AlertSubscriptionRow[]) ?? []
  const ids = rows.map((row) => row.id)
  if (!ids.length) return rows

  const { data: deliveries, error: deliveryError } = await supabase
    .from('alert_deliveries')
    .select('subscription_id, sent_at')
    .in('subscription_id', ids)
    .order('sent_at', { ascending: false })

  if (deliveryError) {
    console.warn('[alertsApi] deliveries list failed', deliveryError.message)
    return rows
  }

  const latest = new Map<string, { last: string; count: number }>()
  for (const row of deliveries || []) {
    const id = String(row.subscription_id || '')
    const sent = String(row.sent_at || '')
    const prev = latest.get(id)
    if (!prev) {
      latest.set(id, { last: sent, count: 1 })
    } else {
      prev.count += 1
      if (sent > prev.last) prev.last = sent
    }
  }

  return rows.map((row) => ({
    ...row,
    last_delivered_at: latest.get(row.id)?.last || null,
    delivery_count: latest.get(row.id)?.count || 0,
  }))
}

export async function fetchAlertChannelStatus(): Promise<AlertChannelStatus> {
  const empty: AlertChannelStatus = {
    email: false,
    telegram: false,
    whatsapp: false,
    push: false,
    last_site_delivery_at: null,
  }
  if (!API_BASE) return empty
  try {
    const res = await fetch(apiUrl('/api/alerts/channels'))
    if (!res.ok) return empty
    const body = (await res.json()) as Partial<AlertChannelStatus>
    return {
      email: Boolean(body.email),
      telegram: Boolean(body.telegram),
      whatsapp: Boolean(body.whatsapp),
      push: Boolean(body.push),
      last_site_delivery_at: body.last_site_delivery_at || null,
    }
  } catch {
    return empty
  }
}

export async function unsubscribeAlert(
  row: Pick<AlertSubscriptionRow, 'id' | 'channel' | 'channel_address'>
): Promise<{ ok: boolean; error?: string }> {
  if (API_BASE) {
    try {
      const supabase = await getSupabase()
      const accessToken = supabase?.auth
        ? (await supabase.auth.getSession()).data.session?.access_token
        : undefined
      const res = await fetch(apiUrl('/api/alerts/unsubscribe'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
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
  payload: AlertSubscribePayload
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { subscribeToAlerts } = await import('@/lib/jobsApi')
  return subscribeToAlerts(payload)
}
