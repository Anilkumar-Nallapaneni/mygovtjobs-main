-- Link normalized jobs to the source registry row that discovered them.
-- Older jobs remain nullable because historical registry identity cannot always
-- be reconstructed safely from a URL alone.
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'jobs_source_id_fkey'
      AND conrelid = 'public.jobs'::regclass
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_source_id_fkey
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_source_id
  ON jobs (source_id)
  WHERE source_id IS NOT NULL;
