import { CATS } from '@/data/categories'
import { STATES } from '@/data/states'
import { isPortalNoiseJob } from '@/utils/jobNoiseFilter'
import { isAllowedOfficialJob, pickOfficialDetailUrl } from '@/utils/officialDomains'
import { extractPostName } from '@/utils/extractPostName'
import { resolveJobCategory } from '@/utils/jobCategory'
import { resolveStateDisplay } from '@/utils/jobStateResolve'
import { isExpiringSoonJob } from '@/utils/latestNotificationsFilters'
import { effectiveVacancyCount } from '@/utils/jobMetadataUtils'

const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]))
const STATE_BY_ID = Object.fromEntries(STATES.map((s) => [s.id, s]))

function sectorForJob(job) {
  const cat = resolveJobCategory(job)
  return { id: cat, name: CAT_BY_ID[cat]?.name || 'State PSC' }
}

function stateForJob(job) {
  const { stateIds, stateName, isNationwide } = resolveStateDisplay(job)
  if (isNationwide || !stateIds.length || stateIds.includes('all')) {
    return { id: 'all', name: 'All India' }
  }
  const primary = String(stateIds[0])
  const st = STATE_BY_ID[primary]
  return { id: primary, name: st?.n || stateName || primary }
}

function extractAdvtNo(job) {
  const fromDetail = job?.advtNo || job?.detail?.advt_no
  if (fromDetail) return String(fromDetail)
  const t = String(job?.title || '')
  const m = t.match(/advt\.?\s*no\.?\s*[:.]?\s*([A-Z0-9/.-]+)/i)
  return m ? m[1] : null
}

function vacancyCount(job) {
  return effectiveVacancyCount(job)
}

function postLabel(job) {
  const post = extractPostName(job)
  if (post) return post
  return String(job?.title || '').replace(/\s+/g, ' ').trim()
}

export type LatestTableSortKey = 'newest' | 'expiringSoon'

export type NotificationRow = ReturnType<typeof jobToNotificationRow>

function sortRowsByDate(rows) {
  return [...rows].sort((a, b) => {
    const da = new Date(a.postDateIso || 0).getTime()
    const db = new Date(b.postDateIso || 0).getTime()
    return db - da
  })
}

/** Flat-list sort for simple latest table: newest post date or soonest deadline. */
export function sortNotificationRows(rows: NotificationRow[], sort: LatestTableSortKey) {
  const copy = [...rows]
  if (sort === 'newest') {
    return copy.sort((a, b) => {
      const da = new Date(a.postDateIso || 0).getTime()
      const db = new Date(b.postDateIso || 0).getTime()
      return db - da
    })
  }
  return copy.sort((a, b) => {
    const aExpired = a._job?.status === 'expired' ? 1 : 0
    const bExpired = b._job?.status === 'expired' ? 1 : 0
    if (aExpired !== bExpired) return aExpired - bExpired
    const da = new Date(a.lastDateIso || '9999-12-31').getTime()
    const db = new Date(b.lastDateIso || '9999-12-31').getTime()
    return da - db
  })
}

function sumVacancies(rows) {
  return rows.reduce((sum, row) => sum + (row.vacancies || 0), 0)
}

function groupMeta(rows) {
  const sorted = sortRowsByDate(rows)
  return {
    count: sorted.length,
    vacancyTotal: sumVacancies(sorted),
    rows: sorted,
  }
}

function groupRowsByCategoryWithin(rows) {
  const byCat = new Map()
  for (const row of rows) {
    if (!byCat.has(row.sectorCategoryId)) byCat.set(row.sectorCategoryId, [])
    byCat.get(row.sectorCategoryId).push(row)
  }

  return CATS.map((c) => {
    const raw = byCat.get(c.id)
    if (!raw?.length) return null
    return { id: c.id, name: c.name, ...groupMeta(raw) }
  }).filter(Boolean)
}

function groupRowsByStateWithin(rows) {
  const byState = new Map()
  for (const row of rows) {
    if (!byState.has(row.stateId)) byState.set(row.stateId, [])
    byState.get(row.stateId).push(row)
  }

  const groups = []
  const allRows = byState.get('all')
  if (allRows?.length) {
    groups.push({ id: 'all', name: 'All India', ...groupMeta(allRows) })
  }
  for (const st of STATES) {
    const raw = byState.get(st.id)
    if (raw?.length) {
      groups.push({ id: st.id, name: st.n, ...groupMeta(raw) })
    }
  }
  return groups
}

export function jobToNotificationRow(job) {
  const sector = sectorForJob(job)
  const state = stateForJob(job)
  const detailUrl = pickOfficialDetailUrl(job)
  return {
    id: job.id || job.slug,
    sectorCategoryId: sector.id,
    sectorCategoryName: sector.name,
    stateId: state.id,
    stateName: state.name,
    postDate: job.published_at || null,
    postDateIso: job.published_at || null,
    board: job.dept || 'Recruitment board',
    postName: postLabel(job),
    vacancies: vacancyCount(job),
    qualification: job.qual && job.qual !== '—' ? job.qual : null,
    advtNo: extractAdvtNo(job),
    lastDate: job.lastDate && job.lastDate !== '—' ? job.lastDate : null,
    lastDateIso: job.lastDate && job.lastDate !== '—' ? job.lastDate : null,
    detailUrl,
    _job: job,
  }
}

function groupRowsByState(items) {
  const byState = new Map()
  for (const row of items) {
    if (!byState.has(row.stateId)) byState.set(row.stateId, [])
    byState.get(row.stateId).push(row)
  }

  const groups = []
  const allRows = byState.get('all')
  if (allRows?.length) {
    const meta = groupMeta(allRows)
    groups.push({
      id: 'all',
      name: 'All India',
      ...meta,
      categoryGroups: groupRowsByCategoryWithin(meta.rows),
    })
  }
  for (const st of STATES) {
    const raw = byState.get(st.id)
    if (raw?.length) {
      const meta = groupMeta(raw)
      groups.push({
        id: st.id,
        name: st.n,
        ...meta,
        categoryGroups: groupRowsByCategoryWithin(meta.rows),
      })
    }
  }
  return groups
}

function groupRowsBySector(items) {
  const bySector = new Map()
  for (const row of items) {
    if (!bySector.has(row.sectorCategoryId)) bySector.set(row.sectorCategoryId, [])
    bySector.get(row.sectorCategoryId).push(row)
  }

  return CATS.map((c) => {
    const raw = bySector.get(c.id)
    if (!raw?.length) return null
    const meta = groupMeta(raw)
    return {
      id: c.id,
      name: c.name,
      ...meta,
      stateGroups: groupRowsByStateWithin(meta.rows),
    }
  }).filter(Boolean)
}

export function filterExpiringSoonRows(rows: NotificationRow[]) {
  return rows.filter((row) => row._job && isExpiringSoonJob(row._job))
}

export function buildLatestNotificationsData(jobs) {
  const items = []

  for (const job of jobs) {
    if (!job || isPortalNoiseJob(job)) continue
    if (!isAllowedOfficialJob(job)) continue
    items.push(jobToNotificationRow(job))
  }

  return {
    items,
    stateGroups: groupRowsByState(items),
    sectorGroups: groupRowsBySector(items),
    total: items.length,
    vacancyTotal: sumVacancies(items),
  }
}
