import { getProfessionBySlug, type ProfessionDef } from '@/data/professions'
import { getQualificationBySlug } from '@/data/qualifications'

/** Primary profession URL for overlapping qualification routes (SEO canonical). */
const QUALIFICATION_TO_PROFESSION: Record<string, string> = {
  medical: 'medical',
  btech: 'engineering',
  teaching: 'teaching',
}

export function getCanonicalProfessionForQualification(
  qualificationSlug: string | null | undefined
): ProfessionDef | null {
  if (!qualificationSlug) return null
  const profSlug = QUALIFICATION_TO_PROFESSION[qualificationSlug]
  return profSlug ? getProfessionBySlug(profSlug) : null
}

/** Related qualification page for a profession landing (secondary browse route). */
export function getRelatedQualificationSlug(prof: ProfessionDef): string | null {
  if (prof.qualificationSlug && !prof.probeRequired) {
    return prof.qualificationSlug
  }
  if (prof.probeRequired && prof.qualificationSlug) {
    const qual = getQualificationBySlug(prof.qualificationSlug)
    return qual?.slug ?? null
  }
  return null
}
