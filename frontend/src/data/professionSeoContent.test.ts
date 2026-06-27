import { describe, expect, it } from 'vitest'

import { getProfessionSeoSections, professionSeoWordCount } from '@/data/professionSeoContent'
import { PROFESSION_SLUGS } from '@/data/professions'

describe('professionSeoContent', () => {
  it('provides SEO sections for every profession slug', () => {
    for (const slug of PROFESSION_SLUGS) {
      const sections = getProfessionSeoSections(slug)
      expect(sections.length).toBeGreaterThanOrEqual(4)
      expect(sections.map((s) => s.id)).toEqual(
        expect.arrayContaining(['intro', 'eligibility', 'recruiters', 'howToApply'])
      )
    }
  })

  it('every profession landing has substantial SEO copy', () => {
    for (const slug of PROFESSION_SLUGS) {
      expect(professionSeoWordCount(slug)).toBeGreaterThan(300)
    }
  })

  it('flagship profession landings exceed 400 words', () => {
    for (const slug of ['medical', 'law', 'engineering', 'finance']) {
      expect(professionSeoWordCount(slug)).toBeGreaterThan(400)
    }
  })

  it('dedicated sections beat generic fallback for law and dental', () => {
    const lawIntro = getProfessionSeoSections('law')[0]?.paragraphs[0] || ''
    expect(lawIntro).toMatch(/LLB|legal|prosecutor/i)
    const dentalIntro = getProfessionSeoSections('dental')[0]?.paragraphs[0] || ''
    expect(dentalIntro).toMatch(/BDS|dental/i)
  })
})
