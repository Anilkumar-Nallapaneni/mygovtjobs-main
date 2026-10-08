-- Alert signups must go through the API (Turnstile + rate limit).
-- The database owner / service role used by the backend can still insert.
BEGIN;

REVOKE INSERT ON TABLE public.alert_subscriptions FROM anon, authenticated;

DROP POLICY IF EXISTS alerts_public_insert ON public.alert_subscriptions;
DROP POLICY IF EXISTS alerts_auth_insert ON public.alert_subscriptions;

COMMIT;
