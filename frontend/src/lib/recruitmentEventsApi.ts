import { dataJsonUrl } from '@/lib/dataCacheBust'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

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

export type RecruitmentEventsSnapshot = {
  generatedAt?: string
  counts?: Partial<Record<RecruitmentEventType, number>>
  byType: Partial<Record<RecruitmentEventType, RecruitmentWithEvents[]>>
}

export const RECRUITMENT_EVENTS_URL = '/data/recruitment-events.json'

const CALENDAR_TYPES: RecruitmentEventType[] = [
  'exam_date',
  'application_open',
  'application_close',
  'admit_card',
  'result',
]

const EVENT_SELECT =
  'id, recruitment_id, event_type, event_date, title, official_url, document_url, status'
const RECRUITMENT_SELECT =
  'id, canonical_slug, organization, title, state_codes, status, primary_job_id, official_url'

let snapshotPromise: Promise<RecruitmentEventsSnapshot | null> | null = null

export function resetRecruitmentEventsSnapshotForTests(): void {
  snapshotPromise = null
}

export function groupEventsWithRecruitments(
  events: RecruitmentEventRow[],
  recruitments: RecruitmentRow[]
): RecruitmentWithEvents[] {
  const byId = new Map<string, RecruitmentRow>(recruitments.map((r) => [r.id, r]))
  const grouped = new Map<string, RecruitmentWithEvents>()
  for (const ev of events) {
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

export function parseRecruitmentEventsSnapshot(raw: unknown): RecruitmentEventsSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const byType = (raw as { byType?: unknown }).byType
  if (!byType || typeof byType !== 'object') return null
  return raw as RecruitmentEventsSnapshot
}

function sliceRows(rows: RecruitmentWithEvents[], limit: number): RecruitmentWithEvents[] {
  if (limit <= 0) return rows
  return rows.slice(0, limit)
}

async function loadStaticSnapshot(): Promise<RecruitmentEventsSnapshot | null> {
  if (!snapshotPromise) {
    snapshotPromise = (async () => {
      try {
        const res = await fetch(dataJsonUrl(RECRUITMENT_EVENTS_URL))
        if (!res.ok) return null
        return parseRecruitmentEventsSnapshot(await res.json())
      } catch {
        return null
      }
    })()
  }
  return snapshotPromise
}

async function staticRowsForType(
  eventType: RecruitmentEventType,
  limit: number
): Promise<RecruitmentWithEvents[]> {
  const snap = await loadStaticSnapshot()
  return sliceRows(snap?.byType?.[eventType] ?? [], limit)
}

async function fetchRecruitmentsByIds(
  ids: string[]
): Promise<RecruitmentRow[]> {
  const supabase = await getSupabase()
  if (!supabase || !ids.length) return []
  const { data, error } = await supabase
    .from('recruitments')
    .select(RECRUITMENT_SELECT)
    .in('id', ids)
  if (error) {
    console.warn('[recruitment_events] fetch recruitments failed', error.message)
    return []
  }
  return (data ?? []) as RecruitmentRow[]
}

export async function fetchEventsByType(
  eventType: RecruitmentEventType,
  limit = 100
): Promise<RecruitmentWithEvents[]> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabase()
    if (supabase) {
      const { data: events, error } = await supabase
        .from('recruitment_events')
        .select(EVENT_SELECT)
        .eq('event_type', eventType)
        .order('event_date', { ascending: false, nullsFirst: false })
        .limit(limit)
      if (error) {
        console.warn(`[recruitment_events] fetch ${eventType} failed`, error.message)
      } else if (events?.length) {
        const recruitmentIds = Array.from(new Set(events.map((e) => e.recruitment_id)))
        const grouped = groupEventsWithRecruitments(
          events as RecruitmentEventRow[],
          await fetchRecruitmentsByIds(recruitmentIds)
        )
        if (grouped.length) return grouped
      }
    }
  }
  return staticRowsForType(eventType, limit)
}

export async function fetchUpcomingCalendar(limit = 60): Promise<RecruitmentWithEvents[]> {
  const today = new Date().toISOString().slice(0, 10)
  if (isSupabaseConfigured()) {
    const supabase = await getSupabase()
    if (supabase) {
      const { data: events, error } = await supabase
        .from('recruitment_events')
        .select(EVENT_SELECT)
        .gte('event_date', today)
        .in('event_type', CALENDAR_TYPES)
        .order('event_date', { ascending: true })
        .limit(limit)
      if (error) {
        console.warn('[recruitment_events] calendar fetch failed', error.message)
      } else if (events?.length) {
        const recruitmentIds = Array.from(new Set(events.map((e) => e.recruitment_id)))
        const grouped = groupEventsWithRecruitments(
          events as RecruitmentEventRow[],
          await fetchRecruitmentsByIds(recruitmentIds)
        )
        if (grouped.length) return grouped
      }
    }
  }

  const snap = await loadStaticSnapshot()
  if (!snap) return []
  const merged: RecruitmentWithEvents[] = []
  for (const eventType of CALENDAR_TYPES) {
    for (const row of snap.byType?.[eventType] ?? []) {
      const upcoming = row.events.filter((ev) => (ev.event_date || '') >= today)
      if (!upcoming.length) continue
      merged.push({ ...row, events: upcoming })
    }
  }
  merged.sort((a, b) => (a.events[0]?.event_date || '').localeCompare(b.events[0]?.event_date || ''))
  return sliceRows(merged, limit)
}
