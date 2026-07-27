-- Private quarantine for records that fail or cannot satisfy publication controls.
CREATE TABLE IF NOT EXISTS public.job_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL UNIQUE,
  source_url TEXT,
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(5, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  review_notes TEXT,
  CONSTRAINT job_review_queue_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'needs_changes')),
  CONSTRAINT job_review_queue_confidence_check
    CHECK (confidence BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_job_review_queue_pending
  ON public.job_review_queue (created_at DESC)
  WHERE status IN ('pending', 'needs_changes');

ALTER TABLE public.job_review_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.job_review_queue FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.job_review_queue TO service_role;

DROP POLICY IF EXISTS job_review_queue_service_role_all ON public.job_review_queue;
CREATE POLICY job_review_queue_service_role_all
  ON public.job_review_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.job_review_queue IS
  'Private quarantine for normalized job candidates that cannot be published automatically.';
