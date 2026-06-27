import { describe, expect, it } from 'vitest'

import {
  getResultTopicByKey,
  getResultTopicBySlug,
  isResultHubPath,
  isValidResultTopicSlug,
  resultTopicRoutePath,
} from '@/data/resultTopics'

describe('resultTopics', () => {
  it('maps topic keys to routes', () => {
    expect(resultTopicRoutePath('sarkari-result')).toBe('/results')
    expect(resultTopicRoutePath('admit-card')).toBe('/results/admit-card')
    expect(resultTopicRoutePath('answer-key')).toBe('/results/answer-key')
  })

  it('resolves topics by slug and key', () => {
    expect(getResultTopicBySlug('syllabus')?.topicKey).toBe('syllabus')
    expect(getResultTopicByKey('cutoff')?.slug).toBe('cutoff')
    expect(isValidResultTopicSlug('interview')).toBe(true)
    expect(isValidResultTopicSlug('nope')).toBe(false)
  })

  it('detects results hub paths', () => {
    expect(isResultHubPath('/results')).toBe(true)
    expect(isResultHubPath('/results/answer-key')).toBe(true)
    expect(isResultHubPath('/results/topics')).toBe(false)
    expect(isResultHubPath('/jobs')).toBe(false)
  })
})
