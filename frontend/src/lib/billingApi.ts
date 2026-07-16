/** Razorpay Premium checkout — requires signed-in user + VITE_API_URL. */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export type BillingConfig = {
  enabled: boolean
  key_id?: string
  amount_paise?: number
  currency?: string
  description?: string
  site_name?: string
}

export type CreateOrderResponse = {
  key_id: string
  order_id: string
  amount: number
  currency: string
  name: string
  description: string
}

async function billingFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  if (!API_BASE) {
    console.warn('[billingApi] API base not configured')
    throw new Error('UNAVAILABLE')
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.warn('[billingApi] request failed', path, res.status, text.slice(0, 200))
    throw new Error('FAILED')
  }
  return res.json() as Promise<T>
}

export async function fetchBillingConfig(): Promise<BillingConfig> {
  if (!API_BASE) return { enabled: false }
  try {
    const res = await fetch(`${API_BASE}/api/billing/config`)
    if (!res.ok) return { enabled: false }
    return (await res.json()) as BillingConfig
  } catch {
    return { enabled: false }
  }
}

export async function createPremiumOrder(accessToken: string): Promise<CreateOrderResponse> {
  return billingFetch<CreateOrderResponse>('/api/billing/create-order', accessToken, {
    method: 'POST',
  })
}

export async function verifyPremiumPayment(
  accessToken: string,
  payload: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }
): Promise<{ ok: boolean; subscription_tier: string }> {
  return billingFetch('/api/billing/verify', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('CHECKOUT_UNAVAILABLE'))
    document.head.appendChild(script)
  })
}

export async function openPremiumCheckout(
  accessToken: string,
  userEmail: string,
  onSuccess: () => void,
  onError: (message: string) => void
): Promise<void> {
  await loadRazorpayScript()
  const order = await createPremiumOrder(accessToken)

  if (!window.Razorpay) {
    onError('CHECKOUT_UNAVAILABLE')
    return
  }

  const rzp = new window.Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    name: order.name,
    description: order.description,
    order_id: order.order_id,
    prefill: { email: userEmail },
    theme: { color: '#FF6B00' },
    handler: async (response: {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
    }) => {
      try {
        await verifyPremiumPayment(accessToken, response)
        onSuccess()
      } catch (err) {
        console.warn('[billingApi] verify failed', err)
        onError('VERIFY_FAILED')
      }
    },
  })
  rzp.open()
}
