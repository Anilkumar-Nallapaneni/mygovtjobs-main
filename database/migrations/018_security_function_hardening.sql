-- Harden function search_path + revoke public EXECUTE on auth helpers.
-- Advisors: function_search_path_mutable, anon/authenticated SECURITY DEFINER executable.

ALTER FUNCTION public.jobs_search_vector_update() SET search_path = public;
ALTER FUNCTION public.enforce_alert_subscription_rate_limit() SET search_path = public;

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
-- Auth trigger still runs as owner; no anon/authenticated RPC needed.
