-- Publication gate + ensure source verification columns (017) exist.

-- 017 columns (idempotent)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_domain text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scraped_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_http_status integer;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS parser_version text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS confidence_score double precision;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS link_last_checked_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS link_last_http_status integer;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS link_consecutive_failures integer NOT NULL DEFAULT 0;

-- Extend status CHECK to include pending (needs_review queue)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('draft', 'pending', 'live', 'expired'));

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED';

UPDATE jobs
SET document_type = 'UNKNOWN'
WHERE document_type IS NULL;

UPDATE jobs
SET verification_status = 'UNVERIFIED'
WHERE verification_status IS NULL OR verification_status = '';

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_document_type_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_document_type_check
  CHECK (
    document_type IS NULL OR document_type IN (
      'RECRUITMENT',
      'RESULT',
      'ADMIT_CARD',
      'ANSWER_KEY',
      'CORRIGENDUM',
      'EXAM_NOTICE',
      'RECRUITMENT_RULES',
      'FORM',
      'TENDER',
      'GENERAL_NOTICE',
      'UNKNOWN'
    )
  );

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_verification_status_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_verification_status_check
  CHECK (
    verification_status IN (
      'UNVERIFIED',
      'NEEDS_REVIEW',
      'VERIFIED',
      'REJECTED'
    )
  );

-- Unknown vacancy counts should be NULL, not 0
ALTER TABLE jobs ALTER COLUMN vacancies DROP NOT NULL;
ALTER TABLE jobs ALTER COLUMN vacancies DROP DEFAULT;

-- Clear duplicate source_url values before unique index (keep newest)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY source_url
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM jobs
  WHERE source_url IS NOT NULL AND length(trim(source_url)) > 0
)
UPDATE jobs j
SET source_url = NULL
FROM ranked r
WHERE j.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_url_unique
  ON jobs (source_url)
  WHERE source_url IS NOT NULL AND length(trim(source_url)) > 0;

CREATE INDEX IF NOT EXISTS idx_jobs_document_type_status
  ON jobs (document_type, status)
  WHERE status IN ('live', 'expired');

CREATE INDEX IF NOT EXISTS idx_jobs_verification_status
  ON jobs (verification_status)
  WHERE verification_status IN ('NEEDS_REVIEW', 'UNVERIFIED');
