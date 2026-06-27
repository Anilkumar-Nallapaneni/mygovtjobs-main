import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('submitContactForm', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns error when API base is missing', async () => {
    vi.stubEnv('VITE_API_URL', '')
    const { submitContactForm } = await import('@/lib/contactApi')
    const result = await submitContactForm({
      name: 'Test',
      email: 'test@example.com',
      message: 'Hello from the contact form test.',
    })
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error).toMatch(/contact@govtjobs.me/i)
    }
  })

  it('posts to contact endpoint', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'sent' }),
    } as Response)

    const { submitContactForm } = await import('@/lib/contactApi')
    const result = await submitContactForm({
      name: 'Test User',
      email: 'user@example.com',
      message: 'This is a long enough test message.',
    })

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/contact',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
