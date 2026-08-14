-- Enforce a single in-flight sync on transaction pooler (advisory locks don't survive commit).

BEGIN;

-- Abandon any leftover concurrent "running" rows before creating the unique constraint.
UPDATE public.sync_runs
SET status = 'failed',
    completed_at = COALESCE(completed_at, now()),
    error_message = COALESCE(
      NULLIF(error_message, ''),
      'abandoned: duplicate running rows before unique mutex'
    )
WHERE status = 'running'
  AND id NOT IN (
    SELECT id
    FROM public.sync_runs
    WHERE status = 'running'
    ORDER BY started_at DESC
    LIMIT 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS sync_runs_one_running
ON public.sync_runs ((true))
WHERE status = 'running';

COMMENT ON INDEX public.sync_runs_one_running IS
  'At most one sync_runs row may be status=running (pooler-safe mutex).';

COMMIT;
