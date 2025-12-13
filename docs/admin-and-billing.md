# Quieter.ai Admin, Models, and Billing

This document describes the current admin surface, model routing, and billing/usage reporting.

## Admin token and environment

The backend exposes a small admin API surface, protected by a single shared admin token.

Environment variables used:

- `ADMIN_TOKEN` – shared secret string used to authorize admin API calls.
- `REPORTS_FROM_EMAIL` – from-address for usage report emails (for example `me+quieter@culex.org`).
- `SMTP_URL` – optional SMTP connection string for sending email. If unset, reports are logged to the API logs instead of sent.

Only you should know the `ADMIN_TOKEN`. The Vue admin screens store it in `localStorage` in the browser and send it as a bearer token to the backend.

## Model configuration and routing

### Table: `model_configs`

`model_configs` defines which provider models Quieter can route to and how much they cost. Important columns:

- `id` – canonical model id used by Quieter (e.g. `anthropic:claude-3-5-haiku-latest`).
- `provider` – provider name (`anthropic`, `openai`, `gemini`, etc.).
- `display_name` – human-friendly label for UIs.
- `api_model_name` – exact model name used in provider API calls.
- `tier` – coarse pricing tier (`cheap`, `standard`, `premium`).
- `quality_score` – subjective 0–1 quality score used when breaking ties.
- `price_input_per_1k_cs` – provider input cost in cents per 1k tokens.
- `price_output_per_1k_cs` – provider output cost in cents per 1k tokens.
- `enabled` – if `false`, the model is ignored for routing.

A seed migration creates a default Anthropic model as the initial `auto` target.

### `/query` routing behavior

- Clients call `POST /query` with a `model` field (optional):
  - If `model` is omitted or set to `"auto"`, the backend selects the cheapest enabled model from `model_configs`, preferring higher `quality_score` when prices tie.
  - If `model` is set to a valid `model_configs.id`, that exact configuration is used.
- The request is scrubbed for sensitive content, then forwarded to the provider using `api_model_name`.
- The provider's `usage` fields (input and output tokens) are used when available; otherwise, a simple length-based estimate is used.

### Cost computation and logging

On each `/query` request, the backend:

1. Resolves a `model_config` for the chosen model.
2. Computes:
   - `provider_cost_cents` from `price_input_per_1k_cs` / `price_output_per_1k_cs` and the token counts.
   - `billed_cents`, currently set equal to `provider_cost_cents` (no markup yet).
3. Logs a row into `usage_logs` with:
   - `model_config_id`
   - `input_tokens`, `output_tokens`, `total_tokens`
   - `provider_cost_cents`, `billed_cents`, and `redactions_count`.
4. Decrements `balances.credits_remaining` for the tenant by `billed_cents`.

This gives you per-tenant, per-model, per-request economics with minimal complexity.

## Account usage and billing views

### `/me/usage`

`GET /me/usage?accountId=...` returns an aggregated view of usage across all tenants belonging to an account:

- `totalRequests` – number of `/query` calls.
- `totalLatencyMs` – sum of recorded latency.
- `totalTokens` – sum of `total_tokens` across usage.
- `totalRedactions` – sum of `redactions_count`.
- `providerCostCents` – sum of `provider_cost_cents`.
- `billedCents` – sum of `billed_cents`.

The Dashboard page uses this to show:

- Conversations shielded.
- Approximate `private` tokens.
- Provider cost and billed amount as dollar figures.

### `/me/report`

`GET /me/report?accountId=...` returns a single structured "privacy usage report" object for that account, including:

- Basic account info (email, primary tenant name, tenant count).
- Aggregated usage metrics (requests, tokens, redactions).
- Aggregated cost metrics (providerCostCents, billedCents).

This endpoint is intended for:

- In-app "Show me my report" views.
- Backing periodic email reports.

## Admin API surface

All admin endpoints require an `Authorization: Bearer <ADMIN_TOKEN>` header and are intended for your own use.

### `POST /admin/login`

- Body: `{ "token": "..." }`.
- Verifies that the provided token matches `ADMIN_TOKEN`.
- Used only by the Vue admin login view to check the token and then store it in `localStorage`.

### `GET /admin/models`

- Returns the list of `model_configs` rows.
- Used by the `/admin/models` page to show configured models and their prices.

### `POST /admin/models`

- Creates a new `model_configs` row with the provided fields.
- Intended for future admin UI to add models without SQL; can be used manually via curl for now.

### `PATCH /admin/models/:id`

- Partially updates an existing `model_configs` row by id.
- Use this to tweak pricing, enable/disable a model, or adjust display names.

### `GET /admin/accounts?email=...`

- Looks up an account by email.
- Returns basic account info, tenants, and balances.
- Intended for future admin UI to search for a user and inspect their plan/usage.

### `POST /admin/send-report`

- Body: `{ "accountId": "..." }`.
- Builds an account report using `/me/report`'s underlying logic.
- If `SMTP_URL` is configured, sends a plaintext email to the account's email address.
- If `SMTP_URL` is not set, logs the report object to the API logs for inspection.

## Admin Vue pages

Two basic admin views exist in the frontend:

- `/admin` – Admin login page where you paste the shared `ADMIN_TOKEN`. On success, the token is stored in `localStorage` and you are redirected to `/admin/models`.
- `/admin/models` – Simple table of configured models with their provider, tier, and prices. For now, this page is read-only and meant as a quick sanity check.

If `/admin` appears blank in production, ensure the latest frontend build (with `AdminLogin.vue` and `AdminModels.vue` wired into the router) has been deployed.
