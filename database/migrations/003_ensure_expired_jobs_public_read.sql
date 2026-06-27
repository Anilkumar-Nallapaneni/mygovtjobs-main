-- Ensure anon/authenticated can read expired jobs (archive listings).
-- Run in Supabase SQL Editor if supabase:audit shows expired: 0 but backend has expired rows.

ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_public_read ON jobs;
CREATE POLICY jobs_public_read ON jobs
  FOR SELECT
  USING (status IN ('live', 'expired'));

GRANT SELECT ON jobs TO anon, authenticated;
