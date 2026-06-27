/// <reference types="vite/client" />

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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
