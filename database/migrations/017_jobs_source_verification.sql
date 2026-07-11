-- Job source verification + link health columns (run when ingest is idle)

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_reports_job_id_fkey'
  ) THEN
    ALTER TABLE job_reports
      ADD CONSTRAINT job_reports_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
END $$;
