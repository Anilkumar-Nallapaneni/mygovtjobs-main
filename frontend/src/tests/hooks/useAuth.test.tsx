/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

const mockGetSession = vi.fn()
const mockSignInWithOtp = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabase: vi.fn(),
}))

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

function buildSupabase() {
  const unsub = vi.fn()
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: unsub } } })
  mockMaybeSingle.mockResolvedValue({
    data: {
      id: 'u1',
      display_name: 'Test User',
      preferred_language: 'en',
      favorite_state_codes: ['up'],
      subscription_tier: 'free',
    },
    error: null,
  })
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })
  return {
    auth: {
      getSession: mockGetSession,
      signInWithOtp: mockSignInWithOtp,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
      update: mockUpdate,
    })),
  }
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isSupabaseConfigured).mockReturnValue(true)
    mockGetSession.mockResolvedValue({ data: { session: null } })
    vi.mocked(getSupabase).mockResolvedValue(buildSupabase() as never)
  })

  it('skips loading when Supabase is not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false)
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.configured).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('loads session and profile on init', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
    })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.id).toBe('u1')
    expect(result.current.profile?.display_name).toBe('Test User')
  })

  it('signInWithEmail validates email and sends OTP', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res = await result.current.signInWithEmail('  user@test.com ')
    expect(res.ok).toBe(true)
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@test.com' })
    )

    res = await result.current.signInWithEmail('')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('email_required')
  })

  it('signInWithEmail surfaces Supabase errors', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limited' } })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const res = await result.current.signInWithEmail('user@test.com')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('failed')
  })

  it('signOut clears profile', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    })
    mockSignOut.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.profile).not.toBeNull())

    await act(async () => {
      await result.current.signOut()
    })
    expect(result.current.profile).toBeNull()
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('updateProfile requires signed-in user', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const res = await result.current.updateProfile({ display_name: 'New' })
    expect(res.ok).toBe(false)
  })

  it('updateProfile patches profile row', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.user?.id).toBe('u1'))

    const res = await result.current.updateProfile({ display_name: 'Updated' })
    expect(res.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('reloadProfile refetches profile for current user', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.profile).not.toBeNull())

    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'u1',
        display_name: 'Reloaded',
        preferred_language: 'hi',
        favorite_state_codes: null,
      },
      error: null,
    })
    await act(async () => {
      await result.current.reloadProfile()
    })
    expect(result.current.profile?.display_name).toBe('Reloaded')
  })
})
