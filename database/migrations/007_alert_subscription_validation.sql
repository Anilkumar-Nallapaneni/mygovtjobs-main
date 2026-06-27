-- Tighten alert signup: basic channel_address format check
-- Run in Supabase SQL Editor after prior migrations

DROP POLICY IF EXISTS alerts_public_insert ON alert_subscriptions;
CREATE POLICY alerts_public_insert ON alert_subscriptions
  FOR INSERT WITH CHECK (
  channel = 'email' AND channel_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  OR channel = 'telegram' AND channel_address ~ '^[0-9]+$'
  OR channel = 'whatsapp' AND channel_address ~ '^\+?[0-9]{10,15}$'
  OR channel = 'push' AND length(trim(channel_address)) >= 8
);
