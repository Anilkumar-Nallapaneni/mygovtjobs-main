-- Additive LGD district identity/provenance. Apply only after review/approval.
-- Existing UUIDs, foreign keys, names and verification policies remain intact.
BEGIN;

ALTER TABLE public.india_districts ADD COLUMN IF NOT EXISTS lgd_district_code TEXT;
ALTER TABLE public.india_districts ADD COLUMN IF NOT EXISTS lgd_state_code TEXT;
ALTER TABLE public.india_districts ADD COLUMN IF NOT EXISTS census_2001_code TEXT;
ALTER TABLE public.india_districts ADD COLUMN IF NOT EXISTS census_2011_code TEXT;
ALTER TABLE public.india_districts ADD COLUMN IF NOT EXISTS lgd_provenance JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_india_districts_lgd_code
  ON public.india_districts(lgd_district_code);

-- Append-only source snapshots retain previous import provenance and records.
CREATE TABLE IF NOT EXISTS public.india_lgd_district_snapshots (
  sha256 TEXT PRIMARY KEY CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  metadata JSONB NOT NULL,
  records JSONB NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.india_lgd_district_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.india_lgd_district_snapshots FROM anon, authenticated;

COMMIT;
