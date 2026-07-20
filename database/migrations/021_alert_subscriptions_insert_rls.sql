-- Migration 021: consolidate alert_subscriptions INSERT RLS
-- Advisor: multiple permissive policies for authenticated INSERT
-- (alerts_auth_insert + alerts_public_insert where public applies to all roles)

-- Restrict channel-format validation to anon only.
DROP POLICY IF EXISTS alerts_public_insert ON public.alert_subscriptions;
CREATE POLICY alerts_public_insert
  ON public.alert_subscriptions
  FOR INSERT
  TO anon
  WITH CHECK (
    ((channel = 'email'::text) AND (channel_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))
    OR ((channel = 'telegram'::text) AND (channel_address ~ '^[0-9]+$'::text))
    OR ((channel = 'whatsapp'::text) AND (channel_address ~ '^\+?[0-9]{10,15}$'::text))
    OR ((channel = 'push'::text) AND (length(TRIM(BOTH FROM channel_address)) >= 8))
  );

-- Authenticated inserts: keep user_id check AND same channel validation.
DROP POLICY IF EXISTS alerts_auth_insert ON public.alert_subscriptions;
CREATE POLICY alerts_auth_insert
  ON public.alert_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((user_id IS NULL) OR (user_id = (SELECT auth.uid())))
    AND (
      ((channel = 'email'::text) AND (channel_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))
      OR ((channel = 'telegram'::text) AND (channel_address ~ '^[0-9]+$'::text))
      OR ((channel = 'whatsapp'::text) AND (channel_address ~ '^\+?[0-9]{10,15}$'::text))
      OR ((channel = 'push'::text) AND (length(TRIM(BOTH FROM channel_address)) >= 8))
    )
  );
