import { describe, expect, it } from 'vitest'
import policy from '@shared/public-job-policy.json'
import { PUBLIC_JOB_POLICY, meetsPublicJobPolicy } from '@/utils/publicJobPolicy'

describe('public job policy contract', () => {
  it('matches shared/public-job-policy.json', () => {
    expect(PUBLIC_JOB_POLICY.documentType).toBe(policy.documentType)
    expect(PUBLIC_JOB_POLICY.minimumCompleteness).toBe(policy.minimumCompleteness)
    expect(PUBLIC_JOB_POLICY.minimumConfidence).toBe(policy.minimumConfidence)
    expect([...PUBLIC_JOB_POLICY.verificationStatuses]).toEqual(policy.verificationStatuses)
  })

  it('accepts a gated recruitment row', () => {
    expect(
      meetsPublicJobPolicy({
        published_to_site: true,
        document_type: 'RECRUITMENT',
        verification_status: 'VERIFIED',
        completeness_score: 92,
        publication_confidence: 97,
      })
    ).toBe(true)
  })

  it('rejects drafts', () => {
    expect(
      meetsPublicJobPolicy({
        published_to_site: false,
        document_type: 'RECRUITMENT',
        verification_status: 'VERIFIED',
        completeness_score: 100,
        publication_confidence: 100,
      })
    ).toBe(false)
  })
})
