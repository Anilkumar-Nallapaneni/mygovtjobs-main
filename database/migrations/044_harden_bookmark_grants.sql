-- Prepared by `supabase migration new harden_bookmark_grants`.
-- REVIEW ONLY: not applied by this audit. No rows or policies are changed.
-- Preserve the existing auth.uid() ownership policies and backend service role.
BEGIN;
REVOKE ALL ON TABLE public.bookmarks FROM PUBLIC, anon;
REVOKE UPDATE, REFERENCES, TRIGGER, TRUNCATE ON TABLE public.bookmarks FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.bookmarks TO authenticated;
COMMIT;
