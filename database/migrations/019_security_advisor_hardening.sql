-- 019: Security advisors — storage listing, RLS initplan, alert insert checks, FK indexes
-- Addresses Supabase linter: public_bucket_allows_listing, auth_rls_initplan,
-- rls_policy_always_true (alerts), unindexed_foreign_keys

-- Public bucket URLs work without a SELECT policy; SELECT enables listing all objects.
DROP POLICY IF EXISTS job_details_public_read ON storage.objects;

-- Re-apply alert insert validation (prod still had WITH CHECK (true) from setup)
DROP POLICY IF EXISTS alerts_public_insert ON alert_subscriptions;
CREATE POLICY alerts_public_insert ON alert_subscriptions
  FOR INSERT
  WITH CHECK (
    (
      channel = 'email'
      AND channel_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
    OR (
      channel = 'telegram'
      AND channel_address ~ '^[0-9]+$'
    )
    OR (
      channel = 'whatsapp'
      AND channel_address ~ '^\+?[0-9]{10,15}$'
    )
    OR (
      channel = 'push'
      AND length(trim(channel_address)) >= 8
    )
  );

-- Wrap auth.uid() / auth.role() so RLS evaluates once per query (auth_rls_initplan)
DROP POLICY IF EXISTS alerts_own_read ON alert_subscriptions;
CREATE POLICY alerts_own_read ON alert_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS alerts_own_update ON alert_subscriptions;
CREATE POLICY alerts_own_update ON alert_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS alerts_auth_insert ON alert_subscriptions;
CREATE POLICY alerts_auth_insert ON alert_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS payment_orders_own_read ON payment_orders;
CREATE POLICY payment_orders_own_read ON payment_orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_own_read ON profiles;
CREATE POLICY profiles_own_read ON profiles
  FOR SELECT
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_own_insert ON profiles;
CREATE POLICY profiles_own_insert ON profiles
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS sync_runs_service_role ON sync_runs;
CREATE POLICY sync_runs_service_role ON sync_runs
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS job_reports_service_all ON job_reports;
CREATE POLICY job_reports_service_all ON job_reports
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- Covering indexes for unindexed FKs
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_job_id ON alert_deliveries (job_id);
CREATE INDEX IF NOT EXISTS idx_job_dates_job_id ON job_dates (job_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_job_id ON job_posts (job_id);
