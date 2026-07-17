-- 020: Service-role policies for RLS-enabled tables that had no policies
-- Addresses Supabase linter: rls_enabled_no_policy on alert_deliveries, raw_ingest, schema_migrations

DROP POLICY IF EXISTS alert_deliveries_service_all ON alert_deliveries;
CREATE POLICY alert_deliveries_service_all ON alert_deliveries
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS raw_ingest_service_all ON raw_ingest;
CREATE POLICY raw_ingest_service_all ON raw_ingest
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS schema_migrations_service_all ON schema_migrations;
CREATE POLICY schema_migrations_service_all ON schema_migrations
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
