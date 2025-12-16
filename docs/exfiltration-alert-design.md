# Quieter.ai Exfiltration Alert Design (Draft)

This document sketches a future, **optional** exfiltration alert system for Quieter.ai. It is not implemented yet, but the data model and metrics are being shaped to support it.

## Goals

- Detect **suspicious or unintended data exfiltration** via prompts sent through Quieter.ai.
- Provide **simple, email-based alerts** similar to password reset/security notifications.
- Keep the feature **optional and configurable per profile (tenant)**.
- Avoid heavy false positives and avoid blocking traffic by default.

## Current Building Blocks

Already in place:

- `usage_logs` table with:
  - `tenant_id`
  - `tokens` (approximate)
  - `redactions_count` (number of scrub hits per request)
- `tenants` table, one row per profile, linked to `accounts`.
- `balances` table with `billing_email` and `plan`.
- Per-account usage summary (`/me/usage`).
- Global usage summary (`/usage`).

These let us measure:

- How many redactions occur per tenant over time.
- How much traffic (requests/tokens) is flowing through a tenant.

## Proposed Config (Per Profile / Tenant)

Add per-tenant configuration (later migration) with fields like:

- `exfil_alerts_enabled` (boolean, default `false`)
- `exfil_alert_email` (text, default `NULL` → fall back to `balances.billing_email` or account email)
- `exfil_alert_threshold` (integer, e.g. number of redactions per window before alerting)
- `exfil_alert_window_minutes` (integer, e.g. 60 minutes)

This config would be editable in a future "Profile settings" UI on the dashboard.

## Detection Heuristic (First Version)

We keep the first version simple, based on **redaction density**:

- For each tenant, over a rolling window (e.g. last 60 minutes):
  - Sum `redactions_count` from `usage_logs`.
  - Optionally weight by `tokens` or number of requests.
- If `redactions_count` in the window exceeds `exfil_alert_threshold`, trigger an alert.

Examples:

- Threshold: `20` redactions in `60` minutes.
- If a tenant suddenly generates many redactions (emails, long IDs, medical codes) in a short time, it may indicate bulk export of sensitive records.

This is deliberately conservative and tunable per tenant.

## Alert Format

When an alert fires:

- Send an email to `exfil_alert_email` (or fallback email) with:

  - Subject: `Quieter.ai – Possible data exfiltration detected for profile "<tenant name>"`
  - Body (example):

    - Timestamp and window used (e.g. last 60 minutes).
    - Number of requests, total tokens, total redactions.
    - A short explanation: "We detected an unusual number of redactions, which may indicate attempts to export sensitive data. Review your logs or client integrations if this was not expected."
    - Links to:
      - Dashboard profile view.
      - Documentation explaining how redaction patterns work and how to tune thresholds.

No raw user content or prompts should be included in the alert email to avoid leaking data via email.

## Operational Flow

High-level sequence:

1. Client sends request to `/query` with tenant API key.
2. Quieter scrubs the prompt and computes `redactions_count`.
3. Quieter logs usage into `usage_logs` (including `tokens`, `redactions_count`).
4. A background job (or lightweight periodic task) runs every N minutes:
   - For each tenant with `exfil_alerts_enabled = true`:
     - Aggregate `redactions_count` and `tokens` over the configured window.
     - Compare against `exfil_alert_threshold`.
     - If exceeded and not already alerted recently, enqueue an email alert.
5. Alerts are rate-limited per tenant to avoid spam (e.g. max 1 alert per hour).

This background job could be implemented as:

- A simple cron-like process in the API service, or
- A separate worker service connected to the same database.

## UI Hooks

On the dashboard (future work):

- In the Profile settings panel:
  - Toggle: `Exfiltration alerts` on/off.
  - Input: `Alert email` (defaults to account/billing email).
  - Inputs: `Threshold` and `Time window` (with safe defaults and helper text).
- In the usage stats area:
  - Show a small note when alerts are enabled, e.g.: "Exfiltration alerts are active for this profile."

For now, the dashboard shows:

- Profile name.
- Tenant count.
- Redactions as "Extra shield hits", which will back the future exfil metrics.

## Future Enhancements

- Separate **exfil patterns** from general scrub patterns (e.g. focus on bulk identifiers, large volumes of structured IDs, or specific schemas).
- Integrate with more sophisticated anomaly detection (e.g., baseline redaction rates per profile, and flag deviations).
- Optionally support **blocking mode** for very strict tenants: if exfil patterns exceed a hard threshold, block requests instead of only alerting.

For now, exfiltration alerts remain a planned, opt-in safety net that builds on top of Quieter.ai's identity shielding and scrubbing metrics.