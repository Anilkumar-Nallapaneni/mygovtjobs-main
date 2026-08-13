import { describe, expect, it } from 'vitest'

import { HUB_SECTIONS } from '@/data/hubSections'
import { isBrowseRoutePath } from '@/hooks/browseStateTypes'
import {
  BOARDS_INDEX_PATH,
  boardRoutePath,
  buildBrowsePath,
  parseBrowsePath,
} from '@/utils/browseRoutes'
import { browseSeoForPath } from '@/utils/browseSeo'
import { CATS } from '@/data/categories'

describe('board browse routes (step 3)', () => {
  it('exposes /boards index and preferred /board/:id paths', () => {
    expect(BOARDS_INDEX_PATH).toBe('/boards')
    expect(boardRoutePath('upsc')).toBe('/board/upsc')
    expect(boardRoutePath('ssc')).toBe('/board/ssc')
    expect(buildBrowsePath({ categoryId: 'upsc' })).toBe('/board/upsc')
  })

  it('parses board and legacy category aliases the same way', () => {
    expect(parseBrowsePath('/board/ssc').categoryId).toBe('ssc')
    expect(parseBrowsePath('/category/ssc').categoryId).toBe('ssc')
    expect(isBrowseRoutePath('/board/upsc')).toBe(true)
    expect(isBrowseRoutePath('/category/upsc')).toBe(true)
  })

  it('links Explore hub to /boards', () => {
    const boardsCard = HUB_SECTIONS.flatMap((section) => section.cards).find(
      (card) => card.id === 'hub-boards'
    )
    expect(boardsCard?.href).toBe('/boards')
  })

  it('builds SEO for boards index and every known board id', () => {
    expect(browseSeoForPath('/boards').title).toMatch(/Board/i)
    expect(browseSeoForPath('/categories').path).toBe('/boards')
    for (const cat of CATS) {
      const meta = browseSeoForPath(boardRoutePath(cat.id))
      expect(meta.title).toContain(cat.name)
    }
  })
})
