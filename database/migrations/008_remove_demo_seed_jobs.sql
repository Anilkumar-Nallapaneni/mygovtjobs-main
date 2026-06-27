-- Remove demo seed rows from production (no longer inserted by supabase_setup.sql).
-- Safe to re-run.

DELETE FROM jobs
WHERE content_hash LIKE 'demo_hash_%'
   OR slug LIKE 'demo-%'
   OR (detail->>'source') = 'demo';
