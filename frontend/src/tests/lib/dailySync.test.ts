import { describe, expect, it, vi, afterEach } from 'vitest'
import { dailySyncLabel, formatRelativeIstAgo } from '@/lib/dailySync'

describe('formatRelativeIstAgo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns hours ago for recent sync', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00+05:30'))
    expect(formatRelativeIstAgo('2026-06-15T07:30:00+05:30')).toBe('2h ago')
  })

  it('returns empty for older than a week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00+05:30'))
    expect(formatRelativeIstAgo('2026-06-01T08:00:00+05:30')).toBe('')
  })
})

describe('dailySyncLabel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const t = (key: string, opts?: Record<string, unknown>) =>
    String(opts?.defaultValue || key)

  it('prefers relative time for recent sync', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00+05:30'))
    const label = dailySyncLabel(
      { completedAtIst: '2026-06-15T07:30:00+05:30' },
      null,
      t
    )
    expect(label).toContain('2h ago')
  })
})
