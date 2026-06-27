-- Speed up public job list queries (live + expired, sorted by published_at).
-- Run in Supabase SQL Editor after prior migrations.

CREATE INDEX IF NOT EXISTS idx_jobs_public_list
  ON jobs (published_at DESC NULLS LAST)
  WHERE status IN ('live', 'expired');
