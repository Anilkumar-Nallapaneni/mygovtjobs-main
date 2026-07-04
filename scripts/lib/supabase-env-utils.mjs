export function projectRefFromSupabaseUrl(value) {
  const match = String(value || '').match(/^https:\/\/([^.]+)\.supabase\.co\/?$/)
  return match ? match[1] : ''
}

export function projectRefFromDatabaseUrl(value) {
  try {
    const parsed = new URL(String(value || '').replace(/^postgresql\+asyncpg:/, 'postgresql:'))
    const username = decodeURIComponent(parsed.username || '')
    if (username.startsWith('postgres.')) return username.slice('postgres.'.length)
    if (parsed.hostname.startsWith('postgres.')) return parsed.hostname.slice('postgres.'.length)
    if (parsed.hostname.startsWith('db.') && parsed.hostname.endsWith('.supabase.co')) {
      return parsed.hostname.slice(3, -'.supabase.co'.length)
    }
  } catch {
    return ''
  }
  return ''
}

function decodeBase64UrlJson(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
}

export function parseSupabaseKey(value) {
  const key = String(value || '').trim()
  if (!key) return { type: 'empty' }
  if (key.startsWith('sb_publishable_')) return { type: 'publishable' }
  if (key.startsWith('sb_secret_')) return { type: 'secret' }

  const parts = key.split('.')
  if (parts.length === 3 && parts[0].startsWith('eyJ')) {
    try {
      return { type: 'jwt', payload: decodeBase64UrlJson(parts[1]) }
    } catch {
      return { type: 'invalid-jwt' }
    }
  }

  return { type: 'unknown' }
}

export function validateSupabaseAnonKey(value, expectedProjectRef = '') {
  const parsed = parseSupabaseKey(value)
  if (parsed.type === 'empty') return 'VITE_SUPABASE_ANON_KEY is required'
  if (parsed.type === 'publishable') return ''
  if (parsed.type === 'secret') {
    return 'VITE_SUPABASE_ANON_KEY must be a publishable/anon key, not an sb_secret key'
  }
  if (parsed.type === 'invalid-jwt') {
    return 'VITE_SUPABASE_ANON_KEY JWT payload could not be decoded'
  }
  if (parsed.type !== 'jwt') {
    return 'VITE_SUPABASE_ANON_KEY must be a Supabase publishable key or legacy anon JWT'
  }

  const payload = parsed.payload || {}
  if (payload.role !== 'anon') {
    return `VITE_SUPABASE_ANON_KEY JWT role must be "anon"${payload.role ? `, got "${payload.role}"` : ''}`
  }
  if (payload.iss !== 'supabase') {
    return `VITE_SUPABASE_ANON_KEY JWT issuer must be "supabase"${payload.iss ? `, got "${payload.iss}"` : ''}`
  }
  if (!payload.ref) {
    return 'VITE_SUPABASE_ANON_KEY JWT is missing the Supabase project ref'
  }
  if (expectedProjectRef && payload.ref !== expectedProjectRef) {
    return `VITE_SUPABASE_ANON_KEY project ref mismatch: key uses ${payload.ref}, env uses ${expectedProjectRef}`
  }
  if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) {
    return 'VITE_SUPABASE_ANON_KEY JWT is expired'
  }
  return ''
}
