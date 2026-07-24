ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_verification_status_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_verification_status_check
  CHECK (
    verification_status IN (
      'UNVERIFIED',
      'NEEDS_REVIEW',
      'VERIFIED',
      'PARTIALLY_VERIFIED',
      'REJECTED'
    )
  );

-- Completeness / publish flags, extraction evidence, and per-source health.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS completeness_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_to_site BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS primary_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS review_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_completeness_range;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_completeness_range
  CHECK (completeness_score BETWEEN 0 AND 100);

-- Keep currently live jobs visible until an admin re-verifies new drafts.
UPDATE jobs
SET
  published_to_site = TRUE,
  verification_status = CASE
    WHEN verification_status IN ('VERIFIED', 'REJECTED') THEN verification_status
    ELSE 'VERIFIED'
  END,
  document_type = COALESCE(NULLIF(document_type, ''), 'RECRUITMENT'),
  completeness_score = GREATEST(completeness_score, 70)
WHERE status = 'live'
  AND published_to_site = FALSE;

CREATE INDEX IF NOT EXISTS idx_jobs_published_to_site
  ON jobs (published_to_site, status)
  WHERE published_to_site = TRUE AND status IN ('live', 'expired');

CREATE INDEX IF NOT EXISTS idx_jobs_completeness_score
  ON jobs (completeness_score)
  WHERE status IN ('live', 'draft', 'pending');

-- Source health for Website/SourceHealthAgent
CREATE TABLE IF NOT EXISTS source_health (
  source_code TEXT PRIMARY KEY,
  homepage_url TEXT NOT NULL DEFAULT '',
  recruitment_url TEXT,
  last_checked_at TIMESTAMPTZ,
  homepage_status INTEGER,
  recruitment_status INTEGER,
  response_time_ms INTEGER,
  discovered_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  pdf_success_count INTEGER NOT NULL DEFAULT 0,
  pdf_failure_count INTEGER NOT NULL DEFAULT 0,
  parser_status TEXT,
  health_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE source_health DROP CONSTRAINT IF EXISTS source_health_status_check;
ALTER TABLE source_health
  ADD CONSTRAINT source_health_status_check
  CHECK (
    health_status IN (
      'HEALTHY',
      'DEGRADED',
      'BROKEN',
      'LAYOUT_CHANGED',
      'BLOCKED',
      'MANUAL_REVIEW',
      'UNKNOWN'
    )
  );

CREATE INDEX IF NOT EXISTS idx_source_health_status
  ON source_health (health_status);
