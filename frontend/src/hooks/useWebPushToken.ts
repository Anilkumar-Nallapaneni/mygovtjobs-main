/**
 * Stable device token for push alert channel (webhook bridge).
 * Uses Push API subscription JSON when VITE_VAPID_PUBLIC_KEY is set; else local id.
 */
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'mgj-push-device-token'

function randomToken(): string {
  const part = () => Math.random().toString(36).slice(2, 10)
  return `mgj-${part()}${part()}`
}

function readStoredToken(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing && existing.length >= 8) return existing
  } catch {
    /* ignore */
  }
  const created = randomToken()
  try {
    localStorage.setItem(STORAGE_KEY, created)
  } catch {
    /* ignore */
  }
  return created
}

export function useWebPushToken() {
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const fallback = readStoredToken()
      const vapid = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim()
      if (!vapid || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) {
          setToken(fallback)
          setReady(true)
        }
        return
      }
      try {
        let reg: Awaited<ReturnType<typeof navigator.serviceWorker.register>>
        try {
          reg = await navigator.serviceWorker.register('/push-sw.js', { scope: '/push/' })
        } catch {
          reg = await navigator.serviceWorker.ready
        }
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapid,
          })
        }
        const json = JSON.stringify(sub.toJSON())
        if (!cancelled) {
          setToken(json.length >= 8 ? json : fallback)
          setReady(true)
        }
      } catch {
        if (!cancelled) {
          setToken(fallback)
          setReady(true)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshToken = useCallback(() => {
    const next = readStoredToken()
    setToken(next)
    return next
  }, [])

  return { token, ready, refreshToken }
}
