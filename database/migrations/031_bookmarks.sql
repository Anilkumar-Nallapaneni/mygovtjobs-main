-- Saved jobs for signed-in users. Users can only see/modify their own rows.
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookmarks_user_job_unique UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created
  ON public.bookmarks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookmarks_job
  ON public.bookmarks (job_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.bookmarks FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.bookmarks TO authenticated;
GRANT ALL ON TABLE public.bookmarks TO service_role;

DROP POLICY IF EXISTS bookmarks_owner_select ON public.bookmarks;
CREATE POLICY bookmarks_owner_select
  ON public.bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bookmarks_owner_insert ON public.bookmarks;
CREATE POLICY bookmarks_owner_insert
  ON public.bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bookmarks_owner_delete ON public.bookmarks;
CREATE POLICY bookmarks_owner_delete
  ON public.bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.bookmarks IS
  'Per-user saved jobs. RLS enforces owner-only read/write and service_role access.';
