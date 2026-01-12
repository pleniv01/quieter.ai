-- Add a higher-quality default model option (Anthropic Sonnet) for overrides
INSERT INTO model_configs (id, provider, display_name, api_model_name, tier, quality_score,
                           price_input_per_1k_cs, price_output_per_1k_cs)
VALUES (
  'anthropic:claude-3-5-sonnet-latest',
  'anthropic',
  'Claude 3.5 Sonnet (High quality)',
  'claude-3-5-sonnet-latest',
  'premium',
  0.9,
  300,  -- $3.00 / 1k input tokens (example, adjust to real)
  1500  -- $15.00 / 1k output tokens (example)
)
ON CONFLICT (id) DO NOTHING;
