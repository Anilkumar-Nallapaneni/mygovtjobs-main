import { CATS, type CategoryId } from '@/data/categories'
import { OFFICIAL_SITES } from '@/data/officialSites'

const VALID_IDS = new Set<string>(CATS.map((c) => c.id))

const SOURCE_CATEGORY = Object.fromEntries(
  OFFICIAL_SITES.map((s) => [s.id, s.category]).filter(([, cat]) => cat)
) as Record<string, CategoryId>

/** Ordered rules — first match wins (most specific patterns first). */
const TEXT_RULES: { id: CategoryId; pattern: RegExp }[] = [
  { id: 'upsc', pattern: /\bUPSC\b|Union Public Service Commission/i },
  { id: 'ssc', pattern: /\bSSC\b|Staff Selection Commission/i },
  {
    id: 'railways',
    pattern: /\brailway\b|\bRRB\b|Railway Recruitment|\bRRC\b|\bIRCTC\b/i,
  },
  {
    id: 'banking',
    pattern: /\bIBPS\b|\bRBI\b|Banking Personnel|State Bank of India|\bSBI\b|\bbank recruitment\b/i,
  },
  {
    id: 'police',
    pattern: /\bpolice\b|\bconstable\b|\bsub[\s-]?inspector\b|\bBSF\b|\bCRPF\b|\bCISF\b|\bITBP\b/i,
  },
  {
    id: 'teaching',
    pattern:
      /\bteach|faculty|professor|lecturer|principal|headmaster|headmistress|instructor|tutor|education officer\b/i,
  },
  {
    id: 'defence',
    pattern:
      /\bDRDO\b|Defence Research|Indian Army|Indian Navy|Indian Air Force|\bAFCAT\b|joinindianarmy|joinindiannavy|Coast Guard|\bBARC\b/i,
  },
  {
    id: 'psu',
    pattern:
      /\bISRO\b|Indian Space Research|\bONGC\b|\bNTPC\b|\bBHEL\b|\bOil India\b|\bBPCL\b|\bHPCL\b|\bGAIL\b|\bSAIL\b|\bBEL\b|\bHAL\b|\bNPCIL\b|\bRITES\b|\bRailTel\b|\bRCIL\b/i,
  },
  {
    id: 'health',
    pattern:
      /\bAIIMS\b|\bmedical officer\b|\bnurse\b|\bANM\b|\bGNM\b|\bdoctor\b|\bhealth mission\b|\bESIC\b|\bhospital\b/i,
  },
  {
    id: 'engineering',
    pattern:
      /\bengineer\b|\bengineering\b|\bAEE\b|\bassistant executive engineer\b|\bjunior engineer\b|\bJE\b|\btechnical officer\b|\bproject engineer\b/i,
  },
]

function normalizeStored(value: unknown): CategoryId | null {
  const cat = String(value || '')
    .trim()
    .toLowerCase()
  if (VALID_IDS.has(cat)) return cat as CategoryId
  return null
}

export function inferCategoryFromText(title = '', dept = ''): CategoryId | null {
  const probe = `${title} ${dept}`.replace(/\s+/g, ' ')
  for (const rule of TEXT_RULES) {
    if (rule.pattern.test(probe)) return rule.id
  }
  if (
    /\bPSC\b|Public Service Commission|High Court|District Court|dcourts|\bOSSC\b|\bOPSC\b|\bOSSSC\b/i.test(
      probe
    )
  ) {
    return 'state'
  }
  return null
}

function categoryFromSource(sourceId: string | undefined): CategoryId | null {
  if (!sourceId) return null
  const cat = SOURCE_CATEGORY[sourceId]
  return cat && VALID_IDS.has(cat) ? cat : null
}

/**
 * Resolve the best category for a job row.
 * Title/dept keywords beat stored JSON and portal defaults.
 */
export function resolveJobCategory(job: {
  title?: string | null
  dept?: string | null
  category?: string | null
  detail?: { source?: string | null } | null
  sourceId?: string | null
}): CategoryId {
  const title = String(job?.title || '')
  const dept = String(job?.dept || '')
  const fromText = inferCategoryFromText(title, dept)
  if (fromText) return fromText

  const stored = normalizeStored(job?.category)
  if (stored) return stored

  const sourceId = String(job?.detail?.source || job?.sourceId || '')
  const fromSource = categoryFromSource(sourceId)
  if (fromSource) return fromSource

  return 'state'
}
