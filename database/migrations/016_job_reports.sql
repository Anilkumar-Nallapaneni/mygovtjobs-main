-- User-submitted job reports (no jobs-table ALTER — safe while ingest runs)

CREATE TABLE IF NOT EXISTS job_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  reporter_email text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_reports_status ON job_reports (status, created_at DESC);

ALTER TABLE job_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_reports' AND policyname = 'job_reports_service_all'
  ) THEN
    CREATE POLICY job_reports_service_all ON job_reports
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
