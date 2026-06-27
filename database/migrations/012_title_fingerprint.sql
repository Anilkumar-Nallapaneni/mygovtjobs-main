-- Near-duplicate title dedupe fingerprint (ROADMAP 2.9)
-- Run after 011_user_alerts_and_monetization.sql

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS title_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_title_fingerprint
  ON jobs (title_fingerprint)
  WHERE title_fingerprint IS NOT NULL;
