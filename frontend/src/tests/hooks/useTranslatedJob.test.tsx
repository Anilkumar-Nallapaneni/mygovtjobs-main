/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTranslatedJob } from '@/hooks/useTranslatedJob'
import type { JobRecord } from '@/types/job'

vi.mock('@/utils/jobContentTranslate', () => ({
  jobNeedsNormalization: vi.fn((job: JobRecord) => job.title.includes('हिंदी')),
  normalizeJobRecordToEnglish: vi.fn(async (job: JobRecord) => ({
    ...job,
    title: `EN:${job.title}`,
  })),
}))

const baseJob = {
  id: '1',
  slug: 'test-job',
  title: 'SSC Recruitment',
  dept: 'SSC',
} as JobRecord

describe('useTranslatedJob', () => {
  it('returns null job when input is null', () => {
    const { result } = renderHook(() => useTranslatedJob(null))
    expect(result.current.job).toBeNull()
    expect(result.current.translating).toBe(false)
    expect(result.current.language).toBe('en')
  })

  it('returns English job unchanged when normalization is not needed', () => {
    const { result } = renderHook(() => useTranslatedJob(baseJob))
    expect(result.current.job?.title).toBe('SSC Recruitment')
    expect(result.current.translating).toBe(false)
  })

  it('normalizes regional-script jobs to English', async () => {
    const hindiJob = { ...baseJob, title: 'हिंदी अधिसूचना' }
    const { result } = renderHook(() => useTranslatedJob(hindiJob))

    await waitFor(() => {
      expect(result.current.translating).toBe(false)
    })
    expect(result.current.job?.title).toBe('EN:हिंदी अधिसूचना')
  })
})
