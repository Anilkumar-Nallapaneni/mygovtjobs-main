-- Authenticated users can read delivery rows for their own subscriptions.
-- Powers /account channel status without exposing other users' addresses.

GRANT SELECT ON TABLE public.alert_deliveries TO authenticated;

DROP POLICY IF EXISTS alert_deliveries_own_read ON public.alert_deliveries;
CREATE POLICY alert_deliveries_own_read
ON public.alert_deliveries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.alert_subscriptions s
    WHERE s.id = alert_deliveries.subscription_id
      AND s.user_id = auth.uid()
  )
);

COMMENT ON POLICY alert_deliveries_own_read ON public.alert_deliveries IS
  'Users see sent_at for subscriptions they own; service_role retains full access.';
