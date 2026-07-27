/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_API_URL?: string
  readonly VITE_JOBS_SOURCE?: string
  readonly VITE_JOB_DETAILS_BUCKET?: string
  readonly VITE_GA_MEASUREMENT_ID?: string
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_BUILD_STAMP?: string
  readonly VITE_DAILY_SYNC_ONLY?: string
  readonly VITE_ENABLE_ADMIN_UI?: 'true' | 'false'
  readonly VITE_ENABLE_BILLING?: 'true' | 'false'
  readonly VITE_SOCIAL_INSTAGRAM_URL?: string
  readonly VITE_SOCIAL_TELEGRAM_URL?: string
  readonly VITE_SOCIAL_X_URL?: string
  readonly VITE_SOCIAL_YOUTUBE_URL?: string
  readonly VITE_TELEGRAM_CHANNEL_URL?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
  readonly VITE_WHATSAPP_GROUP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
