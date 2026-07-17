import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

const BUCKET = import.meta.env.VITE_JOB_DETAILS_BUCKET || 'job-details'

export function jobDetailsPublicUrl(slug: string): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base || base.includes('your-project')) return null
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(slug)}.json`
}

/** Fetch detail JSON from Supabase Storage when configured. */
export async function fetchJobDetailFromStorage(slug: string): Promise<unknown | null> {
  // Prefer public object URL — works without storage SELECT/listing policies.
  const publicUrl = jobDetailsPublicUrl(slug)
  if (publicUrl) {
    try {
      const res = await fetch(publicUrl, { cache: 'default' })
      if (res.ok) return (await res.json()) as unknown
    } catch {
      /* fall through to SDK download */
    }
  }

  if (!isSupabaseConfigured()) return null

  const supabase = await getSupabase()
  if (supabase) {
    const { data, error } = await supabase.storage.from(BUCKET).download(`${slug}.json`)
    if (!error && data) {
      const text = await data.text()
      return JSON.parse(text) as unknown
    }
  }

  return null
}
