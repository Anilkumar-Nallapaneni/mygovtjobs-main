-- Final public job boundary: only approved recruitment rows are visible, and
-- a live row must still be open according to the India calendar date.
DROP POLICY IF EXISTS jobs_public_read ON public.jobs;
CREATE POLICY jobs_public_read
  ON public.jobs
  FOR SELECT
  TO anon, authenticated
  USING (
    published_to_site IS TRUE
    AND document_type = 'RECRUITMENT'
    AND verification_status IN ('VERIFIED', 'PARTIALLY_VERIFIED')
    AND completeness_score >= 70
    AND (
      status = 'expired'
      OR (
        status = 'live'
        AND last_date IS NOT NULL
        AND last_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      )
    )
  );
