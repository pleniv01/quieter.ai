CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id);

ALTER TABLE usage_logs
ADD COLUMN IF NOT EXISTS tokens INTEGER,
ADD COLUMN IF NOT EXISTS redactions_count INTEGER;

CREATE TABLE IF NOT EXISTS balances (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  credits_remaining NUMERIC,
  billing_email TEXT,
  plan TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
