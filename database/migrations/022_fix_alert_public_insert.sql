-- Migration 022: reaffirm anon INSERT policy on alert_subscriptions.
--
-- Investigation note: anonymous signups on the live site failed with
--   42501 "new row violates row-level security policy".
-- Root cause was NOT this policy (anon INSERT already worked under 021's
-- `TO anon` policy). It was the frontend calling `.insert(...).select('id')`:
-- the trailing SELECT (return=representation) is evaluated under RLS, and
-- anonymous visitors have no SELECT policy on alert_subscriptions, so the
-- round-trip failed. Fixed in frontend/src/lib/jobsApi.ts by dropping the
-- `.select()` on the anonymous insert path (return=minimal).
--
-- This migration simply keeps the INSERT policy scoped to `anon` (advisor-clean:
-- one permissive INSERT policy per role) with channel-format validation.
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
