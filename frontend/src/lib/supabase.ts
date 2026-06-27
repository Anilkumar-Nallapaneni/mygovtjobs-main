import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null
let clientInit: Promise<SupabaseClient | null> | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && !String(url).includes('your-project'))
}

/** Lazy-load Supabase client (~200KB) only when a live query is needed. */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null
  if (client) return client
  if (!clientInit) {
    clientInit = import('@supabase/supabase-js').then(({ createClient }) => {
      client = createClient(url!, anonKey!)
      return client
    })
  }
  return clientInit
}
