import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export type UserProfile = {
  id: string
  display_name: string | null
  preferred_language: string | null
  favorite_state_codes: string[] | null
  subscription_tier?: string | null
}

type AuthState = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  configured: boolean
}

export function useAuth(): AuthState & {
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
  updateProfile: (patch: Partial<Pick<UserProfile, 'display_name' | 'preferred_language' | 'favorite_state_codes'>>) => Promise<{ ok: boolean; error?: string }>
  reloadProfile: () => Promise<void>
} {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(configured)

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = await getSupabase()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, preferred_language, favorite_state_codes, subscription_tier')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.warn('[useAuth] profile load failed', error.message)
      return null
    }
    return (data as UserProfile | null) ?? null
  }, [])

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return undefined
    }

    let cancelled = false

    const init = async () => {
      const supabase = await getSupabase()
      if (!supabase || cancelled) return
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      if (data.session?.user) {
        setProfile(await loadProfile(data.session.user.id))
      }
      setLoading(false)
    }

    void init()

    void getSupabase().then((supabase) => {
      if (!supabase || cancelled) return
      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
        setSession(next)
        if (next?.user) {
          setProfile(await loadProfile(next.user.id))
        } else {
          setProfile(null)
        }
      })
      return () => sub.subscription.unsubscribe()
    })

    return () => {
      cancelled = true
    }
  }, [configured, loadProfile])

  const signInWithEmail = useCallback(async (email: string) => {
    const supabase = await getSupabase()
    if (!supabase) {
      console.warn('[useAuth] sign-in unavailable — auth not configured')
      return { ok: false as const, error: 'unavailable' }
    }
    const trimmed = email.trim()
    if (!trimmed) return { ok: false as const, error: 'email_required' }
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    })
    if (error) {
      console.warn('[useAuth] signInWithOtp failed', error.message)
      return { ok: false as const, error: 'failed' }
    }
    return { ok: true as const }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = await getSupabase()
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const updateProfile = useCallback(
    async (patch: Partial<Pick<UserProfile, 'display_name' | 'preferred_language' | 'favorite_state_codes'>>) => {
      const supabase = await getSupabase()
      const userId = session?.user?.id
      if (!supabase || !userId) return { ok: false as const, error: 'not_signed_in' }
      const { error } = await supabase
        .from('profiles')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) {
        console.warn('[useAuth] updateProfile failed', error.message)
        return { ok: false as const, error: 'failed' }
      }
      setProfile(await loadProfile(userId))
      return { ok: true as const }
    },
    [loadProfile, session?.user?.id]
  )

  const reloadProfile = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    setProfile(await loadProfile(userId))
  }, [loadProfile, session?.user?.id])

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    configured,
    signInWithEmail,
    signOut,
    updateProfile,
    reloadProfile,
  }
}
