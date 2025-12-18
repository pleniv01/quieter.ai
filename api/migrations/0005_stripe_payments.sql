-- Stripe payment tracking (for billing history + idempotent webhook handling)

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE TABLE IF NOT EXISTS stripe_payments (
  id               TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_event_id  TEXT NOT NULL UNIQUE,
  stripe_object_id TEXT,
  kind             TEXT NOT NULL,
  amount_cents     INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'usd',
  stripe_created_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stripe_payments_account_created_idx
  ON stripe_payments (account_id, stripe_created_at DESC, created_at DESC);
