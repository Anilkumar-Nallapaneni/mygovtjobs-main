-- Job comments (moderated). Users can post; admins moderate via status.
CREATE TABLE IF NOT EXISTS public.job_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_slug TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 3 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moderated_at TIMESTAMPTZ,
  moderated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_job_comments_job_approved
  ON public.job_comments (job_id, created_at DESC)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_job_comments_pending
  ON public.job_comments (created_at DESC)
  WHERE status = 'pending';

ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.job_comments FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.job_comments TO anon;
GRANT SELECT, INSERT ON TABLE public.job_comments TO authenticated;
GRANT ALL ON TABLE public.job_comments TO service_role;

DROP POLICY IF EXISTS job_comments_public_read_approved ON public.job_comments;
CREATE POLICY job_comments_public_read_approved
  ON public.job_comments
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS job_comments_authenticated_insert ON public.job_comments;
CREATE POLICY job_comments_authenticated_insert
  ON public.job_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND char_length(body) BETWEEN 3 AND 2000
    AND status = 'pending'
  );

COMMENT ON TABLE public.job_comments IS
  'User comments on job postings. Anon reads only approved; authenticated inserts land in pending queue.';
