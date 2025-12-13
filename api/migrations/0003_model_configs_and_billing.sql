-- Model and billing configuration

CREATE TABLE IF NOT EXISTS model_configs (
  id                     TEXT PRIMARY KEY,              -- e.g. 'anthropic:claude-3-5-haiku-latest'
  provider               TEXT NOT NULL,                 -- 'anthropic', 'openai', 'gemini', ...
  display_name           TEXT NOT NULL,                 -- human friendly name
  api_model_name         TEXT NOT NULL,                 -- value passed to provider API
  tier                   TEXT NOT NULL DEFAULT 'cheap', -- cheap|standard|premium
  quality_score          NUMERIC,                       -- 0.0–1.0 subjective
  price_input_per_1k_cs  INTEGER NOT NULL,              -- provider cost in cents per 1k input tokens
  price_output_per_1k_cs INTEGER NOT NULL,              -- provider cost in cents per 1k output tokens
  enabled                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS model_config_id TEXT REFERENCES model_configs(id),
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS provider_cost_cents INTEGER,
  ADD COLUMN IF NOT EXISTS billed_cents INTEGER;

ALTER TABLE balances
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS auto_topup_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_topup_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS auto_topup_threshold_cents INTEGER;

-- Admin users for future admin UI
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed a default model for Anthropic Haiku (adjust prices as needed)
INSERT INTO model_configs (id, provider, display_name, api_model_name, tier, quality_score,
                           price_input_per_1k_cs, price_output_per_1k_cs)
VALUES (
  'anthropic:claude-3-5-haiku-latest',
  'anthropic',
  'Claude 3.5 Haiku (Auto default)',
  'claude-3-5-haiku-latest',
  'cheap',
  0.7,
  50,   -- $0.50 / 1k input tokens (example, adjust to real)
  150   -- $1.50 / 1k output tokens (example)
)
ON CONFLICT (id) DO NOTHING;
