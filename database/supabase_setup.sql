-- =============================================================================
-- My Govt Jobs — ONE-FILE Supabase setup
-- Copy ALL of this into: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rss', 'html', 'api')),
  feed_url TEXT,
  portal_url TEXT,
  state_code TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_ingest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  raw_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  dept TEXT,
  category TEXT,
  state_codes TEXT[] DEFAULT '{}',
  vacancies INT DEFAULT 0,
  qualification TEXT,
  salary TEXT,
  age_limit TEXT,
  last_date DATE,
  apply_url TEXT,
  pdf_storage_path TEXT,
  status TEXT DEFAULT 'live' CHECK (status IN ('draft', 'live', 'expired')),
  published_at TIMESTAMPTZ,
  normalized_at TIMESTAMPTZ,
  content_hash TEXT UNIQUE NOT NULL,
  detail JSONB DEFAULT '{}'::jsonb,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_published ON jobs (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_state_codes ON jobs USING GIN (state_codes);

CREATE TABLE IF NOT EXISTS job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  post_name TEXT NOT NULL,
  vacancies INT DEFAULT 0,
  pay_level TEXT,
  category_breakdown JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS job_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'telegram', 'push')),
  channel_address TEXT NOT NULL,
  state_codes TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  qualification_tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subscription_id, job_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security (public read for visible jobs, public alert signup)
-- ---------------------------------------------------------------------------

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_public_read ON jobs;
CREATE POLICY jobs_public_read ON jobs
  FOR SELECT USING (status IN ('live', 'expired'));

ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alerts_public_insert ON alert_subscriptions;
CREATE POLICY alerts_public_insert ON alert_subscriptions
  FOR INSERT WITH CHECK (
  channel = 'email' AND channel_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  OR channel = 'telegram' AND channel_address ~ '^[0-9]+$'
  OR channel = 'whatsapp' AND channel_address ~ '^\+?[0-9]{10,15}$'
  OR channel = 'push' AND length(trim(channel_address)) >= 8
);

-- No demo seed rows — run ingest after setup:
--   npm run ingest:official
-- Or apply all migrations (incl. demo cleanup): npm run db:migrate

-- Done. Check: Table Editor → jobs (empty until ingest)
