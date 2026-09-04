import { describe, expect, it } from 'vitest'

import { boardSeoBody, stateSeoBodyForId } from '@/data/browseLandingSeo'

describe('browseLandingSeo', () => {
  it('returns unique factual copy for boards and states', () => {
    expect(boardSeoBody('ssc')).toMatch(/ssc\.gov\.in/i)
    expect(boardSeoBody('upsc')).toMatch(/upsc\.gov\.in/i)
    expect(stateSeoBodyForId('up')).toMatch(/Uttar Pradesh/)
    expect(stateSeoBodyForId('up')).not.toBe(stateSeoBodyForId('mh'))
  })
})
