# Self-Hosting Quieter.ai

Quieter.ai is designed to be **self-hosted**.

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
