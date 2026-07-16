const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export type ContactPayload = {
  name: string
  email: string
  mobile?: string
  message: string
  website?: string
}

/** Stable codes for UI — never expose HTTP bodies or env details to visitors. */
export type ContactErrorCode = 'unavailable' | 'failed' | 'network'

export type ContactResult =
  | { ok: true }
  | { ok: false; error: ContactErrorCode }

export async function submitContactForm(
  payload: ContactPayload
): Promise<ContactResult> {
  if (!API_BASE) {
    console.warn('[contactApi] API base not configured')
    return { ok: false, error: 'unavailable' }
  }

  try {
    const res = await fetch(`${API_BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[contactApi] submit failed', res.status, text.slice(0, 200))
      return { ok: false, error: 'failed' }
    }
    return { ok: true }
  } catch (err) {
    console.warn('[contactApi] network error', err)
    return { ok: false, error: 'network' }
  }
}
