export const PUBLIC_JOB_POLICY = {
  documentType: 'RECRUITMENT',
  verificationStatuses: ['VERIFIED', 'PARTIALLY_VERIFIED'],
  minimumCompleteness: 70,
  minimumConfidence: 90,
} as const

type PublicJobCandidate = Record<string, unknown>

export function hasPublicationMetadata(row: PublicJobCandidate): boolean {
  return [
    'published_to_site',
    'publishedToSite',
    'verification_status',
    'verificationStatus',
    'document_type',
    'documentType',
    'completeness_score',
    'completenessScore',
    'publication_confidence',
    'publicationConfidence',
  ].some((key) => key in row)
}

/** Client-side defense in depth; the export/API/RLS policy is authoritative. */
export function meetsPublicJobPolicy(row: PublicJobCandidate): boolean {
  const published = row.published_to_site ?? row.publishedToSite
  const verification = String(row.verification_status ?? row.verificationStatus ?? '').toUpperCase()
  const documentType = String(row.document_type ?? row.documentType ?? '').toUpperCase()
  const completeness = Number(row.completeness_score ?? row.completenessScore ?? 0)
  const confidence = Number(row.publication_confidence ?? row.publicationConfidence ?? 0)
  return (
    published === true &&
    documentType === PUBLIC_JOB_POLICY.documentType &&
    PUBLIC_JOB_POLICY.verificationStatuses.some((status) => status === verification) &&
    completeness >= PUBLIC_JOB_POLICY.minimumCompleteness &&
    confidence >= PUBLIC_JOB_POLICY.minimumConfidence
  )
}
