-- Rename legacy structured-import source tag in job detail JSON.
UPDATE jobs
SET detail = jsonb_set(detail, '{source}', '"structured-import"'::jsonb, true)
WHERE detail->>'source' = 'fja-import';
