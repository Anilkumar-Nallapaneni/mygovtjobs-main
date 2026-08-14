-- Explicit Data API access for the operational control plane and recruitment timeline.
-- Keeps pipeline telemetry private while exposing only active/completed public timelines.

REVOKE ALL ON TABLE public.pipeline_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pipeline_runs TO service_role;

REVOKE ALL ON TABLE public.recruitments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recruitment_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.recruitments, public.recruitment_events TO anon, authenticated;
GRANT ALL ON TABLE public.recruitments, public.recruitment_events TO service_role;

DROP POLICY IF EXISTS public_read_active_recruitments ON public.recruitments;
CREATE POLICY public_read_active_recruitments
  ON public.recruitments FOR SELECT TO anon, authenticated
  USING (status IN ('active', 'completed'));

DROP POLICY IF EXISTS public_read_recruitment_events ON public.recruitment_events;
CREATE POLICY public_read_recruitment_events
  ON public.recruitment_events FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recruitments AS recruitment
    WHERE recruitment.id = recruitment_id
      AND recruitment.status IN ('active', 'completed')
  ));

DROP POLICY IF EXISTS pipeline_runs_service_all ON public.pipeline_runs;
CREATE POLICY pipeline_runs_service_all
  ON public.pipeline_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS recruitments_service_all ON public.recruitments;
CREATE POLICY recruitments_service_all
  ON public.recruitments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS recruitment_events_service_all ON public.recruitment_events;
CREATE POLICY recruitment_events_service_all
  ON public.recruitment_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);
