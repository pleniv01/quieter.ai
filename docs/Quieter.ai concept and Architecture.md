# Quieter.ai concept and Architecture.md

**A universal privacy shield for GPT-powered conversations.**

Quieter.ai is a multi-tenant privacy and billing layer that sits between people (and their apps) and large language model providers. It anonymizes and proxies all AI requests, ensuring that OpenAI, Anthropic, and other LLMs never see end-user identity, IP, or sensitive metadata.

With Quieter.ai, users keep using GPT-style tools—often the same web UIs or clients they already know—while all traffic is routed through Quieter’s infrastructure.

## What It Does

* Accepts GPT-style requests from browsers, desktop agents, and client applications
* Strips identity, cookies, IP, session data, wallet/financial/medical identifiers, and user-specific metadata
* Routes anonymized prompts to GPT/Claude/local models
* Returns responses to the originating browser/app, preserving the user’s normal workflow
* Logs usage per account/tenant for billing and analytics
* Computes and surfaces "privacy wins" (e.g. redacted fields, protected prompts) per user and in aggregate

## Who It’s For

Quieter.ai is primarily for **non-technical users and app creators** who want the benefits of GPT-style models without exposing user identity upstream:

* Individuals using ChatGPT/Claude-style web UIs who want a true privacy shield
* Journaling, wellness, and mental-health tools
* Education and student-facing experiences (including minors)
* Enterprise internal tools and assistants
* Consumer productivity and note-taking apps

DreamSavant is an example of a client app that would route all model traffic through Quieter.ai.

## Key Features

* **Zero-identity passthrough** – model providers never see the human or their network, only Quieter.ai
* **Consumer and team accounts** – each account/tenant has its own API key(s), usage stats, and balance
* **Multi-tenant architecture** – isolated keys, quotas, logs
* **Redaction pipeline (optional)** – an extra, configurable layer that strips obvious PII and sensitive patterns from prompts and metadata; can be disabled or tuned per tenant/account (e.g. off / light / strict)
* **Usage metering & billing** – per-account and aggregate analytics, prepaid plans, and notifications

## Why It Matters

Sending raw user data directly to LLM providers creates privacy risk, compliance headaches, and trust issues.

PrivacyLayer solves this at the infrastructure boundary:

> **Users talk to your app. Your app talks to PrivacyLayer. PrivacyLayer talks to the model. The model never knows who the users are.**

## Result

* Safer applications
* Simpler compliance
* Higher user trust
* Full AI functionality preserved

---

# Architecture

## High-Level Flow

There are two primary flows Quieter.ai supports:

1. **Consumer/browser flow (primary for MVP)**

```
User → Browser Extension / Desktop Agent → Quieter.ai Proxy API → GPT Provider
```

* The user signs up for a Quieter.ai account and receives an API key.
* A browser extension or desktop agent stores this key and transparently routes GPT-style requests through Quieter.ai.
* Quieter.ai anonymizes and scrubs the traffic, calls the provider with Quieter’s identity, and returns responses to the user’s browser/client.

2. **App/developer flow (secondary / pro)**

```
Client App → Quieter.ai SDK / OpenAI-compatible endpoint → Quieter.ai Proxy API → GPT Provider
```

* Apps that integrate directly use Quieter’s endpoint and API keys instead of calling providers directly.

Database (Postgres on Railway) stores:

* tenants/accounts
* usage logs
* balances/plans
* optionally encrypted content or message snippets (if needed)

Tenants have isolated API keys, quotas, and row-level security.

## Backend (Railway)

**Stack:** Node/TypeScript + Express/Fastify, Postgres

**Endpoints (MVP):**

* `POST /auth/signup` – create an account + initial tenant + API key
* `POST /auth/login` – authenticate into the web dashboard (sessions/tokens)
* `POST /query` – main proxy endpoint (requires tenant API key)
* `GET /me/usage` – per-account usage and privacy stats for the dashboard
* `GET /usage` – aggregate usage for internal/marketing dashboards

**Middleware:**

* API key authentication
* Redis rate limiting
* Logging
* Encryption

**Row-Level Security:**
Tenants isolated via RLS using a `tenant_id` column.

## Database Schema (Minimal)

```
accounts (
  id uuid pk,
  email text unique,
  password_hash text,
  created_at timestamp
)

tenants (
  id uuid pk,
  account_id uuid references accounts(id),
  name text,
  api_key_hash text,
  plan text,
  created_at timestamp
)

usage_logs (
  id uuid pk,
  tenant_id uuid references tenants(id),
  model text,
  latency_ms int,
  tokens int,
  redactions_count int,
  status text,
  created_at timestamp
)

balances (
  id uuid pk,
  tenant_id uuid references tenants(id),
  credits_remaining numeric,
  billing_email text,
  plan text,
  updated_at timestamp
)
```

## Quieter.ai SDKs (Pro / Developer Path)

Installable via npm or CDN for developers who want to integrate Quieter.ai directly into their apps. This is **secondary** to the browser-extension and desktop-onboarding path, but remains important for studios and internal tools.

```js
import { Quieter } from "@quieterai/client";
const ai = new Quieter({ apiKey: process.env.QUIETER_API_KEY });
```

## Vue Frontend (Netlify)

* Public marketing and onboarding site (https://quieter.ai)
* Sign up / login flows
* Simple dashboard for:
  * Showing API key(s)
  * Per-account usage and balance
  * "Privacy wins" visualization (e.g. redactions, protected prompts)

## Upstream Model Call

```js
const result = await anthropic.messages.create({
  model: "claude-3-5-haiku-latest",
  max_tokens: 256,
  messages: [
    { role: "user", content: scrubbedPrompt }
  ],
});
```

Identity is **never** sent upstream; providers only see Quieter.ai’s IPs and API keys, not end-user IPs or app networks.

## Usage Metering

Token or character counts extracted and stored in `usage_logs`, tied to tenants/accounts and optionally aggregated for marketing dashboards. When redaction is enabled, we may also store aggregate-only counters (e.g. how many emails/IDs were stripped) to show users their "privacy wins" without logging sensitive raw content.

## Deployment

* Railway for backend container + Postgres
* Netlify for frontend
* Lightweight migration tooling (SQL + Node script, with option to move to Prisma/Drizzle later)

## Security Checklist

* HTTPS
* No identity in requests
* Encrypted logs (optional)
* RLS
* API key rotation
* Rate limits and quotas

## Build Timeline

* MVP: 3–5 days
* Production: 2–3 weeks
* SOC2-ready: 2–3 months

---

# Onboarding Options (Quieter.ai)

Quieter.ai supports multiple onboarding paths, but the **primary focus** is on non‑technical users who want to protect their GPT conversations.

## 1. Browser Extension (Primary Method)

* One‑click install from browser extension stores.
* Users sign into Quieter.ai, obtain an API key, and paste it into the extension.
* The extension intercepts or proxies GPT-style traffic (e.g. ChatGPT/Claude web UIs) and routes it through `/query` using the user’s tenant key.
* Easy uninstall through native browser UI.

## 2. Desktop Agent (Secondary Non‑Technical Path)

* Mac/Windows installer that:
  * Launches a guided setup flow.
  * Stores the Quieter API key securely.
  * Optionally configures a local HTTP endpoint or system proxy for GPT tools.

## 3. SDK Installation (Developer/Pro Path)

Installable via npm or CDN; ideal for studios and internal tools.

```bash
npm install @quieterai/client
```

```js
import { Quieter } from "@quieterai/client";
const ai = new Quieter({ apiKey: process.env.QUIETER_API_KEY });
```

## 4. CMS / Platform Plugins (Future)

For website owners and creators using:

* WordPress
* Shopify
* Ghost
* Netlify/Vercel/VuePress

Enable Quieter.ai without writing custom integration code.

## 5. Silent Wrap Mode (Future)

For advanced developers who want to retrofit existing integrations:

```js
const openai = quieter.wrap(openai);
```

Automatically routes all model calls through Quieter.ai without invasive changes to app logic.

---

# Summary

Quieter.ai offers flexible onboarding so both non‑technical users and developers can adopt it quickly:

* **Browser extension** (primary for individual users)
* **Desktop agent** (for desktop tools and power users)
* **SDK (npm/CDN)** (for studios and internal tools)
* **Future CMS plugins and wrap modes**

These options ensure Quieter.ai can be added to nearly any app or workflow with minimal friction, while keeping GPT providers from ever associating conversations with end-user identity or networks.
