/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearLiveJobsSessionCatalog,
  readLiveJobsSessionCatalog,
  writeLiveJobsSessionCatalog,
} from '@/lib/liveJobsSessionCache'
import type { LiveJobsCatalogResult } from '@/lib/liveJobsFetch'
import type { JobRecord } from '@/types/job'

vi.mock('@/lib/dataCacheBust', () => ({
  appDeployVersion: () => 'test-deploy',
}))

const sampleCatalog = (rows: number): LiveJobsCatalogResult => ({
  rows: Array.from({ length: rows }, (_, i) => ({
    id: String(i),
    slug: `job-${i}`,
    title: `Recruitment ${i} 2026`,
    dept: 'UPSC',
    status: 'live',
  })) as JobRecord[],
  sources: ['official-sites'],
  hasBackend: true,
  error: null,
  dailySync: null,
  rawLength: rows,
})

describe('liveJobsSessionCache', () => {
  beforeEach(() => {
    clearLiveJobsSessionCatalog()
  })

  afterEach(() => {
    clearLiveJobsSessionCatalog()
  })

  it('round-trips a catalog for the same source', () => {
    const catalog = sampleCatalog(3)
    writeLiveJobsSessionCatalog('static', catalog)
    const read = readLiveJobsSessionCatalog('static')
    expect(read?.rows).toHaveLength(3)
    expect(read?.rows[0]?.slug).toBe('job-0')
    expect(read?.sources).toEqual(['official-sites'])
  })

  it('returns null for a different jobs source', () => {
    writeLiveJobsSessionCatalog('static', sampleCatalog(2))
    expect(readLiveJobsSessionCatalog('api')).toBeNull()
  })

  it('clears all session catalogs', () => {
    writeLiveJobsSessionCatalog('static', sampleCatalog(1))
    writeLiveJobsSessionCatalog('auto', sampleCatalog(1))
    clearLiveJobsSessionCatalog()
    expect(readLiveJobsSessionCatalog('static')).toBeNull()
    expect(readLiveJobsSessionCatalog('auto')).toBeNull()
  })
})
