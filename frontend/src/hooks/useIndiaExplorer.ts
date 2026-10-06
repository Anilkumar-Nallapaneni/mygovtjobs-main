import { useEffect, useState } from 'react'
import { fetchIndiaCategory, fetchIndiaDistrict, fetchIndiaDistrictCities, fetchIndiaDistricts, fetchIndiaDistrictDirectory, fetchIndiaOverview, fetchIndiaState, fetchIndiaStates, type IndiaDistrict, type IndiaOverview, type IndiaRecord, type IndiaState } from '@/lib/indiaApi'

export function useIndiaOverview() {
  const [data, setData] = useState<IndiaOverview | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; fetchIndiaOverview().then(value => { if (active) setData(value) }).catch(() => undefined).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  return { data, loading }
}

export function useIndiaStates() {
  const [data, setData] = useState<IndiaState[] | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; fetchIndiaStates().then(value => { if (active) setData(value) }).catch(() => undefined).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  return { data, loading }
}

export function useIndiaState(stateId: string) {
  const [data, setData] = useState<(IndiaState & { counts: { districts: number; cities: number; places: number }; source_name?: string; source_url?: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; setLoading(true); fetchIndiaState(stateId).then(value => { if (active) setData(value) }).catch(() => undefined).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [stateId])
  return { data, loading }
}

export function useIndiaCategory(stateId: string, categoryId: string) {
  const [data, setData] = useState<{ items: IndiaRecord[]; total: number; category: string; message?: string } | null>(null)
  const [loading, setLoading] = useState(Boolean(categoryId))
  useEffect(() => {
    if (!categoryId) { setData(null); setLoading(false); return }
    let active = true
    setLoading(true)
    fetchIndiaCategory(stateId, categoryId, { limit: 60 }).then(value => { if (active) setData(value) }).catch(() => undefined).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [stateId, categoryId])
  return { data, loading }
}

export function useIndiaDistricts(stateId: string) {
  const [data, setData] = useState<IndiaDistrict[] | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; setLoading(true); fetchIndiaDistricts(stateId).then(v => { if (active) setData(v) }).catch(() => undefined).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [stateId])
  return { data, loading }
}

export function useIndiaDistrict(stateId: string, districtId: string) {
  const [data, setData] = useState<IndiaDistrict | null>(null)
  const [loading, setLoading] = useState(Boolean(districtId))
  useEffect(() => { if (!districtId) { setData(null); setLoading(false); return }; let active = true; setLoading(true); fetchIndiaDistrict(stateId, districtId).then(v => { if (active) setData(v) }).catch(() => undefined).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [stateId, districtId])
  return { data, loading }
}

export function useIndiaDistrictCities(stateId: string, districtId: string) {
  const [data, setData] = useState<Array<{ id: string; name: string; slug: string | null }> | null>(null)
  const [loading, setLoading] = useState(Boolean(districtId))
  useEffect(() => { if (!districtId) { setData(null); setLoading(false); return }; let active = true; setLoading(true); fetchIndiaDistrictCities(stateId, districtId).then(v => { if (active) setData(v) }).catch(() => undefined).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [stateId, districtId])
  return { data, loading }
}

export function useIndiaDistrictCategory(stateId: string, districtId: string, categoryId: string) {
  const [data, setData] = useState<{ items: IndiaRecord[]; total: number; category: string; message?: string } | null>(null)
  const [loading, setLoading] = useState(Boolean(districtId && categoryId))
  useEffect(() => { if (!districtId || !categoryId) { setData(null); setLoading(false); return }; let active = true; setLoading(true); fetchIndiaCategory(stateId, categoryId, { districtId, limit: 60 }).then(v => { if (active) setData(v) }).catch(() => undefined).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [stateId, districtId, categoryId])
  return { data, loading }
}


export function useIndiaDistrictDirectory(options: { stateId?: string; q?: string; limit?: number } = {}) {
  const [data, setData] = useState<{ items: IndiaDistrict[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const key = JSON.stringify(options)
  useEffect(() => {
    let active = true
    setLoading(true)
    fetchIndiaDistrictDirectory(options).then(value => { if (active) setData(value) }).catch(() => undefined).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [key])
  return { data, loading }
}
