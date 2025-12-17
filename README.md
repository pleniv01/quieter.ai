# Quieter.ai

**Open-source, self-hosted privacy layer for GPT-style applications, separating users from LLM providers to reduce identity and metadata exposure.**

Quieter.ai is a reference implementation of a privacy boundary between users (or applications) and large language model providers such as Anthropic or OpenAI.

It allows people to benefit from modern language models while reducing how much identity, network, and sensitive metadata is exposed upstream.

> Users talk to their app.  
> The app talks to Quieter.  
> The model provider never sees the user.

---

## What Quieter.ai Does

- Proxies GPT-style requests through a Quieter deployment acting as a privacy boundary
- Shields end-user IP address, cookies, and browser/session metadata
- Optionally scrubs obvious identifiers from prompt content
- Returns model responses without breaking normal workflows
- Supports per-tenant and per-user access keys
- Tracks usage and local privacy-related metrics per account or tenant

Model providers see **the Quieter instance as the caller**, not the originating user or network.

---

## Hosting & Responsibility Model (Important)

Quieter.ai is designed to be **self-hosted**.

When you deploy this software:

- You operate your own infrastructure
- You supply your own LLM provider API keys
- You run your own database
- You are responsible for user data, logs, traffic, and compliance

The maintainers **do not operate a shared proxy, relay, or traffic service** for third-party deployments.

Any hosted instance operated by the maintainer (now or in the future) is **separate from the open-source project** and governed by its own terms.

---

## What Quieter.ai Does *Not* Do

Quieter.ai is intentionally scoped. It does **not**:

- Guarantee anonymity or unlinkability
- Defeat browser fingerprinting
- Protect compromised endpoints or malicious extensions
- Prevent deanonymization via prompt content itself
- Provide legal, medical, or regulatory compliance guarantees

Quieter.ai is a **privacy-enhancing measure**, not a silver bullet.

---

## Threat Model (High-Level)

**In scope:**

- Preventing direct association of prompts with user IP or network
- Avoiding upstream exposure of cookies, sessions, and browser identity
- Reducing accidental leakage of obvious identifiers

**Out of scope:**

- Adversarial browsers or operating systems
- Active fingerprinting techniques
- Targeted or state-level deanonymization
- User self-identification through prompt content

---

## Who This Is For

- Privacy-conscious individuals using GPT or Claude-style interfaces
- Journaling, wellness, and reflective writing tools
- Education and research workflows
- Enterprise internal assistants
- Developers who need a clean privacy boundary without reinventing one

---

## Telemetry

Quieter.ai does **not** collect centralized usage data by default.

Each deployment operates independently, and all usage metrics are local to that instance unless the operator explicitly opts in to sharing anonymous telemetry.

### Optional, Opt-In Telemetry

Operators may choose to enable anonymized, instance-level telemetry to help support the project and guide future development.

When enabled:

- Telemetry is **off by default** and requires explicit configuration
- Telemetry is **instance-level only**, not per user or per tenant
- Telemetry is **anonymous**
- Telemetry is sent on a coarse interval (e.g. once per day)
- Telemetry failures never affect request handling

Telemetry **never includes**:

- Prompt content (raw or transformed)
- User identifiers
- Tenant identifiers
- API keys or secrets
- IP addresses or request metadata

Typical telemetry data may include:

- A randomly generated instance identifier
- Quieter version
- Aggregate request counts
- Whether optional privacy features are enabled

Telemetry can be enabled or disabled at any time by the operator and is fully inspectable in the source code.

---

## Project Philosophy

- **Open by default** — source is available for inspection and audit
- **Opinionated but minimal** — fewer guarantees, clearer boundaries
- **Maintained, not promised** — best-effort upkeep without SLAs

This project exists because the tool should exist — not to become a comprehensive privacy management platform.

## Project Direction

The long-term direction of Quieter.ai is outlined in [ROADMAP.md](./ROADMAP.md).


---

## Attribution

Quieter.ai is open source software released under the Apache License 2.0.

If you deploy or redistribute Quieter.ai and are able to do so, we ask that you include a small attribution such as:

- **Text:**  
  > Powered by Quieter.ai — https://quieter.ai

- **Badge:**  
  ```md
  [![Powered by Quieter.ai](https://raw.githubusercontent.com/pleniv01/quieter.ai/master/badge.svg)](https://quieter.ai)
