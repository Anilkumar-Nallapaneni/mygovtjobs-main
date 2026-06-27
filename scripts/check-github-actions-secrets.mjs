#!/usr/bin/env node
/**
 * Preflight for GitHub Actions ingest — fail fast with clear messages.
 * Run: node scripts/check-github-actions-secrets.mjs
 */
const required = [
  {
    name: 'DATABASE_URL',
    hint: 'Supabase → Database → Connection string → Transaction pooler (SQLAlchemy)',
    test: (v) => {
      if (/^postgresql\+asyncpg:\/\/.+@db\.[^.]+\.supabase\.co:6543\//.test(v)) return false
      if (/^postgresql\+asyncpg:\/\/.+@aws-\d+-[^.]+\.pooler\.supabase\.com:6543\//.test(v)) return true
      if (/^postgresql\+asyncpg:\/\/.+@db\.[^.]+\.supabase\.co:5432\//.test(v)) return true
      return false
    },
    badHint:
      'Do NOT use db.PROJECT.supabase.co:6543 (IPv6-only, fails on GitHub Actions). ' +
      'Use aws-N-REGION.pooler.supabase.com:6543 with user postgres.PROJECT_REF',
  },
  {
    name: 'VITE_SUPABASE_URL',
    hint: 'https://YOUR_REF.supabase.co',
    test: (v) => /^https:\/\/[^.]+\.supabase\.co\/?$/.test(v),
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    hint: 'Supabase → Project Settings → API → anon public key',
    test: (v) => v.length > 20 && !v.includes('service_role'),
  },
]

const serviceRoleSecret = {
  name: 'SUPABASE_SERVICE_ROLE_KEY',
  hint: 'Supabase → Project Settings → API → service_role key (Actions secret only)',
  test: (v) => v.length > 20 && !isPlaceholder(v),
}

let ok = true

function isPlaceholder(value) {
  return /^(PASTE_|YOUR_|change-me)|_HERE$/i.test(String(value || ''))
}

for (const { name, hint, test, badHint } of required) {
  const value = (process.env[name] || '').trim()
  if (!value) {
    console.error(`✗ Missing GitHub secret: ${name}`)
    console.error(`  Add it at: Settings → Secrets and variables → Actions → New repository secret`)
    console.error(`  Value: ${hint}`)
    ok = false
    continue
  }
  if (!test(value)) {
    console.error(`✗ Invalid ${name}`)
    console.error(`  ${badHint || hint}`)
    ok = false
    continue
  }
  console.log(`✓ ${name}`)
}

const verifyServiceRole = process.env.VERIFY_SERVICE_ROLE_KEY === '1'
const serviceRoleValue = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
const hasConcreteServiceRole = serviceRoleValue && !isPlaceholder(serviceRoleValue)
if (verifyServiceRole || hasConcreteServiceRole) {
  if (!hasConcreteServiceRole) {
    console.error(`✗ Missing GitHub secret: ${serviceRoleSecret.name}`)
    console.error(`  Add it at: Settings → Secrets and variables → Actions → New repository secret`)
    console.error(`  Value: ${serviceRoleSecret.hint}`)
    ok = false
  } else if (!serviceRoleSecret.test(serviceRoleValue)) {
    console.error(`✗ Invalid ${serviceRoleSecret.name}`)
    console.error(`  ${serviceRoleSecret.hint}`)
    ok = false
  } else {
    console.log(`✓ ${serviceRoleSecret.name}`)
  }
} else {
  console.log('○ SUPABASE_SERVICE_ROLE_KEY (optional for daily ingest; required for storage upload workflows)')
}

const alertSecrets = [
  {
    name: 'RESEND_API_KEY',
    hint: 'Resend → API Keys (starts with re_)',
    test: (v) => /^re_[A-Za-z0-9_]+$/.test(v),
  },
  {
    name: 'TELEGRAM_BOT_TOKEN',
    hint: 'Telegram @BotFather token (123456789:ABC...)',
    test: (v) => /^\d+:[A-Za-z0-9_-]{20,}$/.test(v),
  },
  {
    name: 'ALERT_FROM_EMAIL',
    hint: 'Verified sender on Resend (e.g. alerts@yourdomain.com)',
    test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  },
  {
    name: 'TWILIO_ACCOUNT_SID',
    hint: 'Twilio Console → Account SID (optional WhatsApp alerts)',
    test: (v) => /^AC[a-f0-9]{32}$/i.test(v),
  },
  {
    name: 'TWILIO_AUTH_TOKEN',
    hint: 'Twilio auth token (optional WhatsApp alerts)',
    test: (v) => v.length >= 20,
  },
  {
    name: 'TWILIO_WHATSAPP_FROM',
    hint: 'Twilio WhatsApp sender e.g. whatsapp:+14155238886',
    test: (v) => /^whatsapp:\+\d{10,15}$/.test(v),
  },
  {
    name: 'PUSH_WEBHOOK_URL',
    hint: 'HTTPS endpoint for push bridge POST {token, title, body}',
    test: (v) => /^https:\/\/.+/.test(v),
  },
]

const verifyAlerts = process.env.VERIFY_ALERT_SECRETS === '1'

if (verifyAlerts) {
  console.log('\nAlert delivery secrets:')
  const present = []
  for (const { name, hint, test } of alertSecrets) {
    const value = (process.env[name] || '').trim()
    if (!value) {
      console.log(`○ ${name} (optional — set to enable ${name === 'ALERT_FROM_EMAIL' ? 'email' : name.replace('_API_KEY', '').replace('_BOT_TOKEN', '')} alerts)`)
      continue
    }
    if (!test(value)) {
      console.error(`✗ Invalid ${name}`)
      console.error(`  ${hint}`)
      ok = false
      continue
    }
    console.log(`✓ ${name}`)
    present.push(name)
  }

  const hasEmail = present.includes('RESEND_API_KEY') && present.includes('ALERT_FROM_EMAIL')
  const hasTelegram = present.includes('TELEGRAM_BOT_TOKEN')
  const hasWhatsApp =
    present.includes('TWILIO_ACCOUNT_SID') &&
    present.includes('TWILIO_AUTH_TOKEN') &&
    present.includes('TWILIO_WHATSAPP_FROM')
  const hasPush = present.includes('PUSH_WEBHOOK_URL')
  if (!hasEmail && !hasTelegram && !hasWhatsApp && !hasPush) {
    console.error(
      '\n✗ No alert delivery channel configured. Add email (Resend), Telegram, Twilio WhatsApp, and/or PUSH_WEBHOOK_URL.'
    )
    ok = false
  }
}

if (!ok) {
  console.error('\nFix repository secrets, then re-run "Supabase auto ingest" workflow.')
  process.exit(1)
}

console.log('\nGitHub Actions secrets look OK.')
