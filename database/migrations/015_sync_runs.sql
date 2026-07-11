-- Track production sync pipeline runs (daily ingest, sync:production, etc.)

CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name text NOT NULL,
  trigger_type text,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  inserted_count integer DEFAULT 0,
  updated_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  error_message text,
  commit_sha text
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at ON sync_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_pipeline_status ON sync_runs (pipeline_name, status);
