-- Per-address alert signup rate limit (blocks direct Supabase INSERT spam)
-- Run after 013_razorpay_payments.sql

CREATE OR REPLACE FUNCTION enforce_alert_subscription_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count INT;
  window_minutes INT := 60;
  max_per_window INT := 5;
BEGIN
  SELECT COUNT(*)::INT INTO recent_count
  FROM alert_subscriptions
  WHERE channel = NEW.channel
    AND lower(trim(channel_address)) = lower(trim(NEW.channel_address))
    AND created_at > NOW() - (window_minutes || ' minutes')::INTERVAL;

  IF recent_count >= max_per_window THEN
    RAISE EXCEPTION 'alert subscription rate limit exceeded for this address'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_subscription_rate_limit ON alert_subscriptions;
CREATE TRIGGER trg_alert_subscription_rate_limit
  BEFORE INSERT ON alert_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_alert_subscription_rate_limit();
