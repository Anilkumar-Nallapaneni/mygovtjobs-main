import { useMemo } from 'react'
import { CATS } from '@/data/categories'
import { getOrgBySlug } from '@/data/orgIndex'
import {
  getProfessionBySlug,
  professionLandingDescription,
  professionLandingTitle,
} from '@/data/professions'
import { getQualificationBySlug } from '@/data/qualifications'
import { getResultTopicByKey } from '@/data/resultTopics'
import type { BrowseStateCore } from '@/hooks/browse/useBrowseStateCore'

export function useBrowseLandingMeta(core: BrowseStateCore) {
  const {
    orgSlug,
    qualificationSlug,
    professionSlug,
    activeCat,
    headlinesTopicKey,
    allIndiaBrowse,
  } = core

  const orgEntry = getOrgBySlug(orgSlug)
  const qualificationEntry = getQualificationBySlug(qualificationSlug)
  const professionEntry = getProfessionBySlug(professionSlug)
  const categoryEntry = activeCat ? CATS.find((c) => c.id === activeCat) : null
  const resultTopicEntry = getResultTopicByKey(headlinesTopicKey)

  const browseLandingTitle = useMemo(
    () =>
      (professionEntry ? professionLandingTitle(professionEntry) : null) ??
      qualificationEntry?.title ??
      (orgEntry ? `${orgEntry.dept} Recruitment 2026` : null) ??
      (categoryEntry ? `${categoryEntry.name} Government Jobs 2026` : null) ??
      (allIndiaBrowse ? 'All India Government Jobs 2026' : null),
    [professionEntry, qualificationEntry, orgEntry, categoryEntry, allIndiaBrowse]
  )

  const browseLandingDescription = useMemo(
    () =>
      (professionEntry ? professionLandingDescription(professionEntry) : null) ??
      qualificationEntry?.seoDescription ??
      (orgEntry
        ? `Live recruitment notifications from ${orgEntry.dept}. Official apply links and PDF notifications only.`
        : categoryEntry
          ? `Live ${categoryEntry.name} recruitment notifications from official government sources.`
          : allIndiaBrowse
            ? 'Central government and nationwide recruitment notifications open to candidates across all states.'
            : null),
    [professionEntry, qualificationEntry, orgEntry, categoryEntry, allIndiaBrowse]
  )

  return {
    orgDept: orgEntry?.dept ?? null,
    browseLandingTitle,
    browseLandingDescription,
    headlinesLandingTitle: resultTopicEntry?.title ?? null,
    headlinesLandingDescription: resultTopicEntry?.seoDescription ?? null,
  }
}
