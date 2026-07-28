-- Persist the deterministic 0-100 publication score and enforce it in RLS.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS publication_confidence NUMERIC(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_publication_confidence_range;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_publication_confidence_range
  CHECK (publication_confidence BETWEEN 0 AND 100);

-- Rows still public after the 2026-07-28 link-aware audit passed the 90-point gate.
UPDATE public.jobs
SET publication_confidence = 90
WHERE published_to_site IS TRUE
  AND status = 'live'
  AND document_type = 'RECRUITMENT'
  AND verification_status IN ('VERIFIED', 'PARTIALLY_VERIFIED')
  AND completeness_score >= 70
  AND last_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
  AND publication_confidence < 90;

CREATE INDEX IF NOT EXISTS idx_jobs_publication_confidence
  ON public.jobs (publication_confidence DESC)
  WHERE published_to_site IS TRUE;

DROP POLICY IF EXISTS jobs_public_read ON public.jobs;
CREATE POLICY jobs_public_read
  ON public.jobs
  FOR SELECT
  TO anon, authenticated
  USING (
    published_to_site IS TRUE
    AND publication_confidence >= 90
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
