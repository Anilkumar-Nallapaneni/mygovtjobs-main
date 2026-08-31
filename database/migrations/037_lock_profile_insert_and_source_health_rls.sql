-- Lock subscription_tier on INSERT (034 only covered UPDATE) and give
-- source_health an explicit service-role policy so RLS is not an empty deny.

BEGIN;

-- Clients may insert their own profile, but billing columns stay free.
REVOKE INSERT ON TABLE public.profiles FROM authenticated;
GRANT INSERT (
  id,
  display_name,
  preferred_language,
  favorite_state_codes
) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_own_insert ON public.profiles;
CREATE POLICY profiles_own_insert
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = id
  AND COALESCE(subscription_tier, 'free') = 'free'
);

CREATE OR REPLACE FUNCTION public.protect_profiles_subscription_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(auth.jwt() ->> 'role', '')
  );

  IF jwt_role = 'service_role' OR (jwt_role IS NULL AND auth.uid() IS NULL) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.subscription_tier := 'free';
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS NOT DISTINCT FROM OLD.subscription_tier THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'permission denied: subscription_tier is billing-controlled'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_subscription_tier ON public.profiles;
CREATE TRIGGER trg_protect_profiles_subscription_tier
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profiles_subscription_tier();

COMMENT ON FUNCTION public.protect_profiles_subscription_tier() IS
  'Forces client INSERTs to free tier and blocks client UPDATEs of subscription_tier.';

ALTER TABLE public.source_health ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.source_health FROM PUBLIC;
REVOKE ALL ON TABLE public.source_health FROM anon, authenticated;

DROP POLICY IF EXISTS source_health_service_role_all ON public.source_health;
CREATE POLICY source_health_service_role_all
ON public.source_health
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

COMMIT;
