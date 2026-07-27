-- Make child recruitment data follow the same publication boundary as jobs and
-- reduce Data API privileges to the operations used by the public frontend.

BEGIN;

DROP POLICY IF EXISTS job_posts_public_read ON public.job_posts;
CREATE POLICY job_posts_public_read
ON public.job_posts
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs AS job
    WHERE job.id = job_posts.job_id
      AND job.published_to_site IS TRUE
      AND job.publication_confidence >= 90
      AND job.document_type = 'RECRUITMENT'
      AND job.verification_status IN ('VERIFIED', 'PARTIALLY_VERIFIED')
      AND job.completeness_score >= 70
      AND (
        job.status = 'expired'
        OR (
          job.status = 'live'
          AND job.last_date IS NOT NULL
          AND job.last_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
        )
      )
  )
);

DROP POLICY IF EXISTS job_dates_public_read ON public.job_dates;
CREATE POLICY job_dates_public_read
ON public.job_dates
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs AS job
    WHERE job.id = job_dates.job_id
      AND job.published_to_site IS TRUE
      AND job.publication_confidence >= 90
      AND job.document_type = 'RECRUITMENT'
      AND job.verification_status IN ('VERIFIED', 'PARTIALLY_VERIFIED')
      AND job.completeness_score >= 70
      AND (
        job.status = 'expired'
        OR (
          job.status = 'live'
          AND job.last_date IS NOT NULL
          AND job.last_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
        )
      )
  )
);

DROP POLICY IF EXISTS "Public can read job updates" ON public.job_updates;
DROP POLICY IF EXISTS job_updates_public_read ON public.job_updates;
CREATE POLICY job_updates_public_read
ON public.job_updates
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs AS job
    WHERE job.id = job_updates.job_id
      AND job.published_to_site IS TRUE
      AND job.publication_confidence >= 90
      AND job.document_type = 'RECRUITMENT'
      AND job.verification_status IN ('VERIFIED', 'PARTIALLY_VERIFIED')
      AND job.completeness_score >= 70
      AND (
        job.status = 'expired'
        OR (
          job.status = 'live'
          AND job.last_date IS NOT NULL
          AND job.last_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
        )
      )
  )
);

REVOKE ALL PRIVILEGES ON TABLE
  public.alert_deliveries,
  public.alert_subscriptions,
  public.job_dates,
  public.job_posts,
  public.job_reports,
  public.job_updates,
  public.jobs,
  public.payment_orders,
  public.profiles,
  public.raw_ingest,
  public.schema_migrations,
  public.source_health,
  public.sources,
  public.sync_runs
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.jobs,
  public.sources,
  public.job_posts,
  public.job_dates,
  public.job_updates
TO anon, authenticated;

GRANT INSERT ON TABLE public.alert_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.alert_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.payment_orders TO authenticated;

DROP POLICY IF EXISTS alert_deliveries_service_all ON public.alert_deliveries;
CREATE POLICY alert_deliveries_service_all
ON public.alert_deliveries
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS job_reports_service_all ON public.job_reports;
CREATE POLICY job_reports_service_all
ON public.job_reports
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS raw_ingest_service_all ON public.raw_ingest;
CREATE POLICY raw_ingest_service_all
ON public.raw_ingest
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS schema_migrations_service_all ON public.schema_migrations;
CREATE POLICY schema_migrations_service_all
ON public.schema_migrations
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS sync_runs_service_role ON public.sync_runs;
CREATE POLICY sync_runs_service_role
ON public.sync_runs
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS profiles_own_insert ON public.profiles;
CREATE POLICY profiles_own_insert
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_own_read ON public.profiles;
CREATE POLICY profiles_own_read
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

COMMIT;
