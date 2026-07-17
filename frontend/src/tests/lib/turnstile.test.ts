import { describe, expect, it } from 'vitest'
import { isTurnstileConfigured, turnstileHeaders, turnstileSiteKey } from '@/lib/turnstile'

describe('turnstile helpers', () => {
  it('reports unset site key as not configured', () => {
    expect(turnstileSiteKey()).toBe('')
    expect(isTurnstileConfigured()).toBe(false)
  })

  it('builds header only when token present', () => {
    expect(turnstileHeaders(null)).toEqual({})
    expect(turnstileHeaders('')).toEqual({})
    expect(turnstileHeaders('  tok  ')).toEqual({ 'X-Turnstile-Token': 'tok' })
  })
})
