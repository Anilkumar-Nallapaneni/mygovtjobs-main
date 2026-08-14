-- Batch A trust polish:
-- 1) Alert UPDATE cannot rewrite channel/address to arbitrary values
-- 2) Public SELECT on sources excludes operational last_error

BEGIN;

-- ── alert_subscriptions UPDATE ─────────────────────────────────────────────
-- Clients may only toggle filters / active flag; channel + address stay fixed
-- after insert (service_role retains full UPDATE for delivery tooling).
REVOKE UPDATE ON TABLE public.alert_subscriptions FROM authenticated;
GRANT UPDATE (
  is_active,
  state_codes,
  categories,
  qualification_tags
) ON TABLE public.alert_subscriptions TO authenticated;

DROP POLICY IF EXISTS alerts_own_update ON public.alert_subscriptions;
CREATE POLICY alerts_own_update
ON public.alert_subscriptions
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    (channel = 'email' AND channel_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
    OR (channel = 'telegram' AND channel_address ~ '^[0-9]+$')
    OR (channel = 'whatsapp' AND channel_address ~ '^\+?[0-9]{10,15}$')
    OR (channel = 'push' AND length(TRIM(BOTH FROM channel_address)) >= 8)
  )
);

-- ── sources public read ────────────────────────────────────────────────────
-- Keep catalog metadata public; hide scraper failure text (URLs / infra hints).
REVOKE SELECT ON TABLE public.sources FROM anon, authenticated;
GRANT SELECT (
  id,
  code,
  name,
  type,
  feed_url,
  portal_url,
  state_code,
  is_active,
  last_run_at,
  created_at
) ON TABLE public.sources TO anon, authenticated;

COMMENT ON COLUMN public.sources.last_error IS
  'Operational scraper error; not granted to anon/authenticated (service_role only).';

COMMIT;
