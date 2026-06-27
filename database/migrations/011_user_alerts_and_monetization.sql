-- User-linked alert subscriptions, freemium tier, sponsored job flag
-- Run after 009_user_profiles.sql

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
  CHECK (subscription_tier IN ('free', 'premium'));

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_jobs_sponsored_live
  ON jobs (published_at DESC)
  WHERE status = 'live' AND is_sponsored = TRUE;

-- Authenticated users can read/update their own alert subscriptions
DROP POLICY IF EXISTS alerts_own_read ON alert_subscriptions;
CREATE POLICY alerts_own_read ON alert_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS alerts_own_update ON alert_subscriptions;
CREATE POLICY alerts_own_update ON alert_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS alerts_auth_insert ON alert_subscriptions;
CREATE POLICY alerts_auth_insert ON alert_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

GRANT SELECT, UPDATE ON alert_subscriptions TO authenticated;
