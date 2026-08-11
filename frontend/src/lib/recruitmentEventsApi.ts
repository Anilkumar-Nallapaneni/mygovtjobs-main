import { getSupabase } from '@/lib/supabase'

export type RecruitmentEventType =
  | 'notification'
  | 'application_open'
  | 'application_close'
  | 'fee_deadline'
  | 'correction_window'
  | 'exam_date'
  | 'admit_card'
  | 'answer_key'
  | 'result'
  | 'document_verification'
  | 'final_result'

export type RecruitmentEventRow = {
  id: string
  recruitment_id: string
  event_type: RecruitmentEventType
  event_date: string | null
  title: string | null
  official_url: string | null
  document_url: string | null
  status: 'expected' | 'announced' | 'active' | 'completed' | 'cancelled'
}

export type RecruitmentRow = {
  id: string
  canonical_slug: string
  organization: string
  title: string
  state_codes: string[]
  status: string
  primary_job_id: string | null
  official_url: string | null
}

export type RecruitmentWithEvents = RecruitmentRow & {
  events: RecruitmentEventRow[]
}

export async function fetchEventsByType(
  eventType: RecruitmentEventType,
  limit = 100
): Promise<RecruitmentWithEvents[]> {
  const supabase = await getSupabase()
  if (!supabase) return []

  const { data: events, error } = await supabase
    .from('recruitment_events')
    .select('id, recruitment_id, event_type, event_date, title, official_url, document_url, status')
    .eq('event_type', eventType)
    .order('event_date', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error) {
    console.warn(`[recruitment_events] fetch ${eventType} failed`, error.message)
    return []
  }
  if (!events?.length) return []

  const recruitmentIds = Array.from(new Set(events.map((e) => e.recruitment_id)))
  const { data: recruitments, error: rErr } = await supabase
    .from('recruitments')
    .select('id, canonical_slug, organization, title, state_codes, status, primary_job_id, official_url')
    .in('id', recruitmentIds)
  if (rErr) {
    console.warn('[recruitment_events] fetch recruitments failed', rErr.message)
    return []
  }

  const byId = new Map<string, RecruitmentRow>(
    (recruitments ?? []).map((r) => [r.id as string, r as RecruitmentRow])
  )
  const grouped = new Map<string, RecruitmentWithEvents>()
  for (const ev of events as RecruitmentEventRow[]) {
    const r = byId.get(ev.recruitment_id)
    if (!r) continue
    let bucket = grouped.get(r.id)
    if (!bucket) {
      bucket = { ...r, events: [] }
      grouped.set(r.id, bucket)
    }
    bucket.events.push(ev)
  }
  return Array.from(grouped.values())
}

export async function fetchUpcomingCalendar(limit = 60): Promise<RecruitmentWithEvents[]> {
  const supabase = await getSupabase()
  if (!supabase) return []
  const today = new Date().toISOString().slice(0, 10)
  const { data: events, error } = await supabase
    .from('recruitment_events')
    .select('id, recruitment_id, event_type, event_date, title, official_url, document_url, status')
    .gte('event_date', today)
    .in('event_type', ['exam_date', 'application_open', 'application_close', 'admit_card', 'result'])
    .order('event_date', { ascending: true })
    .limit(limit)
  if (error) {
    console.warn('[recruitment_events] calendar fetch failed', error.message)
    return []
  }
  if (!events?.length) return []

  const recruitmentIds = Array.from(new Set(events.map((e) => e.recruitment_id)))
  const { data: recruitments } = await supabase
    .from('recruitments')
    .select('id, canonical_slug, organization, title, state_codes, status, primary_job_id, official_url')
    .in('id', recruitmentIds)
  const byId = new Map<string, RecruitmentRow>(
    (recruitments ?? []).map((r) => [r.id as string, r as RecruitmentRow])
  )
  const grouped = new Map<string, RecruitmentWithEvents>()
  for (const ev of events as RecruitmentEventRow[]) {
    const r = byId.get(ev.recruitment_id)
    if (!r) continue
    let bucket = grouped.get(r.id)
    if (!bucket) {
      bucket = { ...r, events: [] }
      grouped.set(r.id, bucket)
    }
    bucket.events.push(ev)
  }
  return Array.from(grouped.values())
}
