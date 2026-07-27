-- Align the public Data API with the application publication boundary.
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_public_read ON public.jobs;
CREATE POLICY jobs_public_read
  ON public.jobs
  FOR SELECT
  TO anon, authenticated
  USING (
    published_to_site IS TRUE
    AND status IN ('live', 'expired')
    AND verification_status IN ('VERIFIED', 'PARTIALLY_VERIFIED')
  );

GRANT SELECT ON TABLE public.jobs TO anon, authenticated;

-- Anonymous alert rows must remain unowned. Authenticated ownership must be
-- derived from auth.uid(); callers cannot assign a different user_id.
DROP POLICY IF EXISTS alerts_public_insert ON public.alert_subscriptions;
CREATE POLICY alerts_public_insert
  ON public.alert_subscriptions
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND (
      (channel = 'email' AND channel_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
      OR (channel = 'telegram' AND channel_address ~ '^[0-9]+$')
      OR (channel = 'whatsapp' AND channel_address ~ '^\+?[0-9]{10,15}$')
      OR (channel = 'push' AND length(trim(channel_address)) >= 8)
    )
  );

DROP POLICY IF EXISTS alerts_auth_insert ON public.alert_subscriptions;
CREATE POLICY alerts_auth_insert
  ON public.alert_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      (channel = 'email' AND channel_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
      OR (channel = 'telegram' AND channel_address ~ '^[0-9]+$')
      OR (channel = 'whatsapp' AND channel_address ~ '^\+?[0-9]{10,15}$')
      OR (channel = 'push' AND length(trim(channel_address)) >= 8)
    )
  );

GRANT INSERT ON TABLE public.alert_subscriptions TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.alert_subscriptions TO authenticated;
