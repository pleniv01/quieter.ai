# Self-Hosting Quieter.ai

Quieter is designed as a multitenant-capable system. Even in single-user deployments, tenant boundaries are preserved for isolation and future flexibility.

This document explains, at a high level, what that means and what is required.

---

## High-Level Architecture

A typical deployment consists of:

- A frontend web application (e.g. Netlify)
- A backend API service (e.g. Railway)
- A PostgreSQL database
- An LLM provider account (e.g. Anthropic)

The backend API acts as the privacy boundary between users and the LLM provider.

---

## Your Responsibilities When Self-Hosting

If you deploy Quieter.ai yourself, **you are responsible for**:

- Hosting and uptime
- Supplying your own LLM provider API keys
- Operating your own database
- Issuing and managing user access keys
- Handling logs, data retention, and compliance
- Paying all infrastructure and API usage costs

The maintainers do **not** operate a shared proxy or traffic relay for third-party deployments.

---

## Reference Deployment (Suggested)

Quieter.ai is developed and tested using:

- **Railway** — backend hosting and PostgreSQL
- **Netlify** — frontend hosting
- **Anthropic** — LLM provider

Other platforms may work, but these are the reference implementations.

---

## Environment Variables

Secrets must be provided via environment variables and **must not be committed**.

Typical required variables include:

```env
ANTHROPIC_API_KEY=your_key_here
DATABASE_URL=postgresql://user:pass@host:5432/quieter
QUIETER_TELEMETRY_ENABLED=false
```

- `QUIETER_TELEMETRY_ENABLED` controls optional, anonymized, instance-level telemetry.
- When absent or set to anything other than `true`, **no telemetry code runs**.

## Telemetry

By default, Quieter **does not** send any telemetry to the project maintainers.

Telemetry is strictly opt-in and operates only at the **instance level**:

- No per-user, per-tenant, or per-request identifiers
- No prompt content (raw or hashed)
- No metadata fields
- No headers
- No IP addresses
- No API keys
- No tenant or user identifiers

When enabled (`QUIETER_TELEMETRY_ENABLED=true` on the backend API service), the instance sends at most, on a coarse interval (about once per day):

- A randomly generated, anonymous `instance_id` (UUID stored locally next to the API code)
- The Quieter version
- Which optional scrub layers are enabled (e.g. basic PII, crypto, financial, medical)
- Aggregate request counts for this process (e.g. total requests, `/proxy` requests, `/query` requests) over the interval

No per-request timestamps or payload details are collected or transmitted.

Operators can always:

- Inspect the implementation in `api/telemetry.js`
- Disable telemetry entirely by omitting `QUIETER_TELEMETRY_ENABLED` or setting it to `false`
- Fork or modify the telemetry endpoint if desired

