-- Razorpay payment orders for Premium subscription (migration 013)
-- Run after 012_title_fingerprint.sql

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT,
  amount_paise INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders (status);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_orders_own_read ON payment_orders;
CREATE POLICY payment_orders_own_read ON payment_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Inserts/updates via service role (backend API only)
GRANT SELECT ON payment_orders TO authenticated;
