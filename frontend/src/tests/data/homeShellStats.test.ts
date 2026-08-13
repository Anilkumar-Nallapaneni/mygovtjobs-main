import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  HOME_SHELL_CATALOG_STATS,
  HOME_SHELL_HEADLINE_STATS,
  HOME_SHELL_HERO_STATS,
  HOME_SHELL_ORG_COUNT,
} from '@/data/homeShellStats'

describe('homeShellStats', () => {
  it('matches the gated live-jobs.json snapshot (no inflated hero totals)', () => {
    const payload = JSON.parse(
      readFileSync(join(process.cwd(), 'public/data/live-jobs.json'), 'utf8')
    ) as { items?: Array<{ vacancies?: number; dept?: string; organization?: string }> }
    const items = Array.isArray(payload.items) ? payload.items : []
    const vacancies = items.reduce((sum, row) => sum + (Number(row.vacancies) || 0), 0)
    const orgs = new Set(
      items
        .map((row) => String(row.dept || row.organization || '').trim())
        .filter(Boolean)
    ).size

    expect(items.length).toBeGreaterThan(0)
    expect(HOME_SHELL_HEADLINE_STATS.notifications).toBe(items.length)
    expect(HOME_SHELL_HEADLINE_STATS.vacancies).toBe(vacancies)
    expect(HOME_SHELL_CATALOG_STATS.liveNotices).toBe(items.length)
    expect(HOME_SHELL_CATALOG_STATS.vacancies).toBe(vacancies)
    expect(HOME_SHELL_HERO_STATS.live).toBe(items.length)
    expect(HOME_SHELL_HERO_STATS.posts).toBe(vacancies)
    expect(HOME_SHELL_ORG_COUNT).toBe(Math.max(orgs, 1))

    // Guard against the old fake marketing totals regressing.
    expect(HOME_SHELL_HEADLINE_STATS.notifications).toBeLessThan(200)
    expect(HOME_SHELL_HEADLINE_STATS.vacancies).toBeLessThan(2000)
  })
})
