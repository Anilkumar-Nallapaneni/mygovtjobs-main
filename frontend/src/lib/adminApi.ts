const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const ADMIN_KEY_STORAGE = 'mygovtjobs-admin-key'

export function getStoredAdminKey(): string {
  try {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

export function setStoredAdminKey(key: string): void {
  try {
    if (key) sessionStorage.setItem(ADMIN_KEY_STORAGE, key)
    else sessionStorage.removeItem(ADMIN_KEY_STORAGE)
  } catch {
    /* ignore */
  }
}

export type AdminDashboard = {
  jobs: { total: number; live: number; draft: number; expired: number }
  sources: {
    total: number
    active: number
    with_errors: number
    last_run_within_24h: number
    stale?: number
    success_rate_pct?: number
  }
  ingest: {
    raw_ingest_total: number
    last_sync: Record<string, unknown> | null
  }
  scrapers: Array<{
    code: string
    enabled: boolean
    module?: string
    last_run_at: string | null
    last_error: string | null
  }>
  tables: Record<string, number | string>
}

async function adminFetch<T>(path: string, adminKey: string): Promise<T> {
  if (!API_BASE) throw new Error('VITE_API_URL is not set')
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-Admin-Key': adminKey },
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error('Invalid admin key')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchAdminDashboard(adminKey: string): Promise<AdminDashboard> {
  return adminFetch<AdminDashboard>('/api/admin/dashboard', adminKey)
}

export async function runIngest(adminKey: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/admin/ingest/run-all?force=true`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
