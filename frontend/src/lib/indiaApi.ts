export type IndiaState = {
  id: string
  name: string
  abbreviation: string | null
  administrative_type: 'state' | 'union_territory'
  region: string | null
  svg_id: string | null
  capital?: string | null
  district_count: number
  city_count: number
  place_count: number
  job_count: number
}

export type IndiaOverview = {
  states: number
  districts: number
  cities: number
  places: number
  schools: number
  colleges: number
  universities: number
  hospitals: number
  companies: number
}

export type IndiaRecord = {
  id: string
  name: string
  category: string
  description?: string | null
  website?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  source_name?: string | null
  source_url?: string | null
  verified_at?: string | null
  district_name?: string | null
  city_name?: string | null
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function getJson<T>(path: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`India API ${response.status}`)
    return await response.json() as T
  } finally {
    window.clearTimeout(timer)
  }
}

export async function fetchIndiaOverview() {
  return getJson<IndiaOverview>('/api/india/overview')
}

export async function fetchIndiaStates() {
  const response = await getJson<{ items: IndiaState[] }>('/api/india/states')
  return response.items
}

export async function fetchIndiaState(stateId: string) {
  return getJson<IndiaState & { counts: { districts: number; cities: number; places: number; jobs: number }; source_name?: string; source_url?: string }>(`/api/india/states/${encodeURIComponent(stateId)}`)
}

export type IndiaDistrict = { id: string; name: string; slug: string | null; state_id?: string; state_name?: string; city_count?: number; place_count?: number; source_url?: string | null }

export async function fetchIndiaDistricts(stateId: string) {
  const response = await getJson<{ items: IndiaDistrict[] }>(`/api/india/states/${encodeURIComponent(stateId)}/districts`)
  return response.items
}

export async function fetchIndiaDistrictDirectory(options: { stateId?: string; q?: string; limit?: number } = {}) {
  const params = new URLSearchParams()
  if (options.stateId) params.set('state_id', options.stateId)
  if (options.q) params.set('q', options.q)
  if (options.limit) params.set('limit', String(options.limit))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return getJson<{ items: IndiaDistrict[]; total: number }>(`/api/india/districts${suffix}`)
}

export async function fetchIndiaDistrict(stateId: string, districtId: string) {
  return getJson<IndiaDistrict>(`/api/india/states/${encodeURIComponent(stateId)}/districts/${encodeURIComponent(districtId)}`)
}

export async function fetchIndiaDistrictCities(stateId: string, districtId: string) {
  const response = await getJson<{ items: Array<{ id: string; name: string; slug: string | null; source_url?: string | null }> }>(`/api/india/states/${encodeURIComponent(stateId)}/districts/${encodeURIComponent(districtId)}/cities`)
  return response.items
}

export async function fetchIndiaCategory(stateId: string, category: string, options: { q?: string; limit?: number; districtId?: string; cityId?: string } = {}) {
  const params = new URLSearchParams()
  if (options.q) params.set('q', options.q)
  if (options.limit) params.set('limit', String(options.limit))
  if (options.districtId) params.set('district_id', options.districtId)
  if (options.cityId) params.set('city_id', options.cityId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return getJson<{ items: IndiaRecord[]; total: number; category: string; state_id: string; source?: string; message?: string }>(`/api/india/states/${encodeURIComponent(stateId)}/categories/${encodeURIComponent(category)}${suffix}`)
}

export async function searchIndia(query: string) {
  return getJson<{ items: Array<{ record_type: string; record_key: string; name: string; parent_name: string; state_id: string | null; source_url: string | null }>; query: string }>(`/api/india/search?q=${encodeURIComponent(query)}`)
}
