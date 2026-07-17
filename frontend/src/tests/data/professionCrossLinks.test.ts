import { describe, expect, it } from 'vitest'

import {
  getCanonicalProfessionForQualification,
  getRelatedQualificationSlug,
} from '@/data/professionCrossLinks'
import { getProfessionBySlug } from '@/data/professions'

describe('professionCrossLinks', () => {
  it('maps qualification slugs to canonical profession pages', () => {
    expect(getCanonicalProfessionForQualification('medical')?.slug).toBe('medical')
    expect(getCanonicalProfessionForQualification('btech')?.slug).toBe('engineering')
    expect(getCanonicalProfessionForQualification('teaching')?.slug).toBe('teaching')
    expect(getCanonicalProfessionForQualification('defence')).toBeNull()
  })

  it('links broad professions to qualification pages', () => {
    const medical = getProfessionBySlug('medical')!
    const nursing = getProfessionBySlug('nursing')!
    expect(getRelatedQualificationSlug(medical)).toBe('medical')
    expect(getRelatedQualificationSlug(nursing)).toBe('medical')
  })
})
