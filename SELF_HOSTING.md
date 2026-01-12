# Self-Hosting Quieter.ai

Quieter is designed as a multitenant-capable system. Even in single-user deployments, tenant boundaries are preserved for isolation and future flexibility, and you can attach your own universe of users or applications to a single instance.

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
QUIETER_DEFAULT_MODEL_ID=anthropic:claude-3-5-sonnet-latest
```

- `QUIETER_TELEMETRY_ENABLED` controls optional, anonymized, instance-level telemetry.
- When absent or set to anything other than `true`, **no telemetry code runs**.
- `QUIETER_DEFAULT_MODEL_ID` forces `/query` to use a specific model when `model=auto`.

## Quickstart: Reference Self-Hosted Deployment

This is a minimal example of how you might self-host Quieter.ai using the reference stack.

1. **Clone the repo**
   - `git clone https://github.com/pleniv01/quieter.ai.git`
   - `cd quieter.ai`

2. **Provision infrastructure** (example)
   - Backend + Postgres on Railway
   - Frontend on Netlify
   - LLM provider account (e.g. Anthropic)

3. **Configure backend (Railway)**
   - Service root: `api/`
   - Set environment variables:
     - `DATABASE_URL` — Railway Postgres URL
     - `ANTHROPIC_API_KEY` — your Anthropic key
     - `ADMIN_TOKEN` — random string for admin API access
     - `QUIETER_TELEMETRY_ENABLED=false` (or omit for no telemetry)
   - Set start command (if needed): `cd api && node index.js`

4. **Run database migrations**
   - From your local machine (with `DATABASE_URL` pointing at Railway):
     - `cd api`
     - `npm install`
     - `npm run migrate`

5. **Configure frontend (Netlify)**
   - Build directory: `frontend/`
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`
   - Environment variables:
     - `VITE_API_BASE_URL` pointing at your deployed backend API URL

6. **Create your first account and tenant**
   - Visit the deployed frontend
   - Sign up for an account
   - Use the dashboard to obtain an API key and see usage

7. **(Optional) Enable anonymous instance telemetry**
   - On the backend, set `QUIETER_TELEMETRY_ENABLED=true`
   - Use `GET /admin/telemetry-debug` with `Authorization: Bearer <ADMIN_TOKEN>` to verify the telemetry configuration and counters

For more detail, see the main README and the `frontend/src/views` docs pages.

---

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
