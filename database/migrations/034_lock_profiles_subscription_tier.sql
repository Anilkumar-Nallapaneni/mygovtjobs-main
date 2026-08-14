-- Lock billing columns on profiles so authenticated clients cannot self-escalate
-- subscription_tier (or forge premium via PostgREST PATCH).
-- Backend / service_role retain full UPDATE (Razorpay webhook path).

BEGIN;

-- Narrow client UPDATE to non-billing columns only.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (
  display_name,
  preferred_language,
  favorite_state_codes,
  updated_at
) ON TABLE public.profiles TO authenticated;

-- Defense in depth: reject tier changes unless service_role JWT or non-JWT DB role
-- (SQLAlchemy pooler as postgres / table owner).
CREATE OR REPLACE FUNCTION public.protect_profiles_subscription_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  IF NEW.subscription_tier IS NOT DISTINCT FROM OLD.subscription_tier THEN
    RETURN NEW;
  END IF;

  jwt_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(auth.jwt() ->> 'role', '')
  );

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Direct database connections (backend) have no PostgREST JWT.
  IF jwt_role IS NULL AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'permission denied: subscription_tier is billing-controlled'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_subscription_tier ON public.profiles;
CREATE TRIGGER trg_protect_profiles_subscription_tier
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profiles_subscription_tier();

REVOKE ALL ON FUNCTION public.protect_profiles_subscription_tier() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_profiles_subscription_tier() FROM anon, authenticated;

COMMENT ON FUNCTION public.protect_profiles_subscription_tier() IS
  'Prevents clients from changing profiles.subscription_tier; service_role / backend only.';

COMMIT;
