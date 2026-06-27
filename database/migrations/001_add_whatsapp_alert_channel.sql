-- Run on existing Supabase/Postgres if alert_subscriptions was created before whatsapp support.
ALTER TABLE alert_subscriptions DROP CONSTRAINT IF EXISTS alert_subscriptions_channel_check;
ALTER TABLE alert_subscriptions ADD CONSTRAINT alert_subscriptions_channel_check
  CHECK (channel IN ('email', 'whatsapp', 'telegram', 'push'));
