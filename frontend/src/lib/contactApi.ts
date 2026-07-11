const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export type ContactPayload = {
  name: string
  email: string
  mobile?: string
  message: string
  website?: string
}

export type ContactResult =
  | { ok: true }
  | { ok: false; error: string }

export async function submitContactForm(
  payload: ContactPayload
): Promise<ContactResult> {
  if (!API_BASE) {
    return {
      ok: false,
      error: 'Contact form requires the API backend. Email contact@livegovtjobs.com directly.',
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const json = await res.json()
        if (json?.detail) detail = String(json.detail)
      } catch {
        const text = await res.text().catch(() => '')
        if (text) detail = text
      }
      return { ok: false, error: detail }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
