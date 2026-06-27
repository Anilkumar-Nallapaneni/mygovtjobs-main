import { readFileSync } from 'node:fs'
import process from 'node:process'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { inferCategoryFromText, resolveJobCategory } from '@/utils/jobCategory'

describe('inferCategoryFromText', () => {
  it('detects central commissions', () => {
    expect(inferCategoryFromText('UPSC CAPF AC 2026', '')).toBe('upsc')
    expect(inferCategoryFromText('SSC CGL Notification', '')).toBe('ssc')
  })

  it('detects engineering and teaching posts', () => {
    expect(inferCategoryFromText('TGPSC AEE Recruitment 2026', 'TGPSC')).toBe('engineering')
    expect(inferCategoryFromText('WBPSC Principal Recruitment 2026', 'WBPSC')).toBe('teaching')
    expect(inferCategoryFromText('Mizoram PSC Headmaster Recruitment 2026', 'Mizoram PSC')).toBe(
      'teaching'
    )
  })

  it('detects DRDO and ISRO correctly', () => {
    expect(inferCategoryFromText('DRDO DEAL Internship 2026', 'DRDO')).toBe('defence')
    expect(inferCategoryFromText('ISRO Scientist Recruitment 2026', 'ISRO')).toBe('psu')
  })

  it('maps state commission clerks to state', () => {
    expect(inferCategoryFromText('OSSC Clerk Recruitment 2026', 'OSSC')).toBe('state')
    expect(resolveJobCategory({ title: 'OSSC Clerk Recruitment 2026', dept: 'OSSC' })).toBe('state')
  })
})

describe('resolveJobCategory', () => {
  it('prefers title inference over stored state', () => {
    expect(
      resolveJobCategory({
        title: 'OSSC Junior Engineer Recruitment 2026',
        dept: 'OSSC',
        category: 'state',
      })
    ).toBe('engineering')
  })

  it('keeps stored category when title is generic', () => {
    expect(
      resolveJobCategory({
        title: 'Online Registration extended till 15.06.2026',
        dept: 'IBPS',
        category: 'banking',
      })
    ).toBe('banking')
  })

  it('uses source category when stored is missing', () => {
    expect(
      resolveJobCategory({
        title: 'Latest notification',
        dept: 'Union Public Service Commission',
        detail: { source: 'upsc' },
      })
    ).toBe('upsc')
  })

  it('fixes ISRO items stored as defence', () => {
    expect(
      resolveJobCategory({
        title: 'ISRO Conducted the 23rd National Space Science Symposium',
        dept: 'ISRO',
        category: 'defence',
        detail: { source: 'isro' },
      })
    ).toBe('psu')
  })
})

describe('live-jobs category audit', () => {
  it('resolves categories for bundled live jobs', () => {
    const raw = readFileSync(join(process.cwd(), 'public/data/live-jobs.json'), 'utf8')
    const payload = JSON.parse(raw) as { items?: unknown[] }
    const jobs = (payload.items || []) as Array<{
      title?: string
      dept?: string
      category?: string
      detail?: { source?: string }
    }>
    if (!jobs.length) return

    const byCat: Record<string, number> = {}
    let unresolved = 0
    for (const job of jobs) {
      const cat = resolveJobCategory(job)
      byCat[cat] = (byCat[cat] || 0) + 1
      if (!cat) unresolved += 1
    }

    expect(unresolved).toBe(0)
    expect(byCat.state).toBeGreaterThan(0)
    expect(Object.keys(byCat).length).toBeGreaterThan(3)
  })
})
