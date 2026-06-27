-- Public read-only bucket for per-job PDF detail JSON (replaces git-tracked job-details/)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('job-details', 'job-details', true, 5242880, ARRAY['application/json']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS job_details_public_read ON storage.objects;
CREATE POLICY job_details_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'job-details');
