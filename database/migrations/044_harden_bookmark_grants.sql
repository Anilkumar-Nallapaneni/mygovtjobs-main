-- Authenticated keeps owner SELECT, INSERT, and DELETE.
-- TRUNCATE ignores row-level security, so that grant is revoked.
BEGIN;
REVOKE ALL ON TABLE public.bookmarks FROM PUBLIC, anon;
REVOKE UPDATE, REFERENCES, TRIGGER, TRUNCATE ON TABLE public.bookmarks FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.bookmarks TO authenticated;
COMMIT;
