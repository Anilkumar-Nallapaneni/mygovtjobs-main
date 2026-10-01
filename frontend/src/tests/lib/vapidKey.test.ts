import { describe, expect, it } from 'vitest'
import { urlBase64ToUint8Array } from '@/lib/vapidKey'

describe('urlBase64ToUint8Array', () => {
  it('decodes a url-safe base64 VAPID public key to 65 bytes', () => {
    const raw = new Uint8Array(65)
    raw[0] = 4
    for (let i = 1; i < raw.length; i += 1) raw[i] = i
    const b64 = globalThis.btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const decoded = urlBase64ToUint8Array(b64)
    expect(decoded).toHaveLength(65)
    expect(decoded[0]).toBe(4)
    expect(decoded[64]).toBe(64)
  })
})
