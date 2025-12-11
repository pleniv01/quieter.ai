# PrivacyLayer

**A universal privacy shield for GPT-powered applications.**

PrivacyLayer is a drop-in multi-tenant service that sits between any application and large language model providers. It anonymizes and proxies all AI requests, ensuring that OpenAI, Anthropic, and other LLMs never see user identity or sensitive metadata.

Apps continue to deliver full AI functionality. Model providers see only anonymized traffic.

## What It Does

* Accepts model requests from client applications
* Strips identity, cookies, IP, session data, and user identifiers
* Routes anonymized prompts to GPT/Claude/local models
* Returns responses to the originating app
* Optionally logs usage, encrypted per tenant

## Who It’s For

Any product that uses LLMs and cannot expose user identity upstream:

* Journaling and mental-health apps
* Educational platforms
* Productivity/workplace tools
* Enterprise internal systems
* Consumer apps collecting personal text

DreamSavant is an example of a client.

## Key Features

* **Zero-identity passthrough** – model providers never see the human
* **Drop-in integration** – lightweight SDK wraps existing model calls
* **Multi-tenant architecture** – isolated keys, quotas, logs
* **Encrypted storage (optional)** – configurable per tenant
* **Usage metering** – token-level analytics and dashboards

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

```
Client App → PrivacyLayer SDK → PrivacyLayer Proxy API → GPT Provider
```

Database (Postgres on Railway) stores:

* tenants
* usage logs
* encrypted content (optional)

Tenants have isolated API keys, quotas, and row-level security.

## Backend (Railway)

**Stack:** Node/TypeScript + Express/Fastify, Postgres

**Endpoints:**

* POST /auth/tenant
* POST /query
* GET /usage

**Middleware:**

* API key authentication
* Redis rate limiting
* Logging
* Encryption

**Row-Level Security:**
Tenants isolated via RLS using a `tenant_id` column.

## Database Schema (Minimal)

```
tenants (
  id uuid pk,
  name text,
  api_key text (hashed),
  plan text,
  created_at timestamp
)

messages (
  id uuid pk,
  tenant_id uuid,
  role text,
  content text (encrypted),
  tokens int,
  created_at timestamp
)

usage_logs (
  id uuid pk,
  tenant_id uuid,
  tokens int,
  cost decimal,
  at timestamp
)
```

## PrivacyLayer SDK

Installable via npm or CDN.

```js
import { PrivacyLayer } from "@privacylayer/client";
const ai = new PrivacyLayer({ apiKey: import.meta.env.VITE_PRIVACY_KEY });
```

## Vue Frontend (Netlify)

* Store API key in Netlify env vars
* Use SDK
* Optional Netlify serverless proxy to keep secrets off the client

## Upstream Model Call

```js
const result = await openai.chat.completions.create({
  model: "gpt-4.1",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content }
  ],
});
```

Identity is **never** sent upstream.

## Usage Metering

Token counts extracted and stored in `usage_logs`.

## Deployment

* Railway for backend container + Postgres
* Netlify for frontend
* Prisma/Drizzle for migrations

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

# Onboarding Options

PrivacyLayer supports multiple onboarding paths to accommodate both technical and non‑technical users.

## 1. SDK Installation (Primary Method)

Install via npm or CDN; ideal for Vue/Vite/React developers.

### Example

```bash
npm install @privacylayer/client
```

```js
import { PrivacyLayer } from "@privacylayer/client";
const ai = new PrivacyLayer({ apiKey: import.meta.env.VITE_PRIVACY_KEY });
```

## 2. One‑Click Netlify Integration

* Injects required environment variables
* Installs SDK automatically
* Can add Netlify proxy function for safer server‑side calls

## 3. Browser Extension (Non‑Technical Users)

The easiest option for non-technical users.

* One‑click install from browser extension stores
* Handles script injection via safe, permissioned APIs
* Easy uninstall through native browser UI
* Ideal for consumer-facing apps

## 4. Desktop Installer (Guided Onboarding)

A Mac/Windows installer that:

* Launches a guided setup flow
* Prompts user to install the official browser extension
* Can preconfigure tenant keys or preferences

## 5. CMS / Platform Plugins

For website owners and creators using:

* WordPress
* Shopify
* Ghost
* Netlify/Vercel/VuePress

Enable PrivacyLayer without touching code.

## 6. Copy‑Paste Snippet

```html
<script src="https://cdn.privacylayer.ai/embed.js" defer></script>
```

For users comfortable with HTML but not JS development.

## 7. Silent Wrap Mode

Developers can retrofit PrivacyLayer without modifying their prompt logic.

```js
const openai = privacy.wrap(openai);
```

Automatically routes all model calls through PrivacyLayer.

---

# Summary

PrivacyLayer offers flexible onboarding so both developers and non‑technical users can adopt it quickly:

* **SDK (npm/CDN)**
* **One‑click Netlify setup**
* **Browser extension**
* **Desktop installer**
* **CMS plugins**
* **Copy‑paste embed**
* **Silent wrap mode**

These options ensure PrivacyLayer can be added to nearly any app or workflow with minimal friction.
