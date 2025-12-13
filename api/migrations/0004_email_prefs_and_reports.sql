-- Email preferences per account
CREATE TABLE IF NOT EXISTS account_email_prefs (
  account_id      TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  receive_reports BOOLEAN NOT NULL DEFAULT TRUE,
  receive_news    BOOLEAN NOT NULL DEFAULT FALSE,
  frequency       TEXT NOT NULL DEFAULT 'weekly', -- weekly, monthly, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track last time we sent a usage report email per account
CREATE TABLE IF NOT EXISTS account_report_log (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind        TEXT NOT NULL DEFAULT 'usage-report'
);
