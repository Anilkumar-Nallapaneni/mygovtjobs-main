-- Full-text search on jobs.title, dept, category
-- Run in Supabase SQL Editor after migration 005

CREATE OR REPLACE FUNCTION jobs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.dept, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_search_vector_trigger ON jobs;
CREATE TRIGGER jobs_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, dept, category ON jobs
  FOR EACH ROW EXECUTE FUNCTION jobs_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_jobs_search_vector ON jobs USING GIN (search_vector);

-- Backfill existing rows
UPDATE jobs SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(dept, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'C')
WHERE search_vector IS NULL;
