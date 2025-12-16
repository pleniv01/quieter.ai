# Quieter.ai

**A privacy-enhancing proxy layer for GPT-style conversations.**

Quieter.ai is an open-source reference implementation of a privacy boundary between users (or apps) and large language model providers such as Anthropic or OpenAI.

It allows people to benefit from modern language models while reducing how much identity, network, and sensitive metadata is exposed upstream.

> Users talk to their app.  
> The app talks to Quieter.ai.  
> The model provider never sees the user.

---

## What Quieter.ai Does

- Proxies GPT-style requests through Quieter-controlled infrastructure
- Shields end-user IP address, cookies, and browser/session metadata
- Optionally scrubs obvious PII patterns from prompts
- Returns model responses without breaking normal workflows
- Tracks usage and aggregate “privacy wins” per account or tenant

Model providers see **Quieter.ai as the caller**, not the originating user or network.

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

- Privacy-conscious individuals using GPT/Claude web UIs
- Journaling, wellness, and reflective writing tools
- Education and student-facing applications
- Enterprise internal assistants
- Developers who need a clean privacy boundary without reinventing one

---

## Project Philosophy

- **Open by default** — source is available for inspection and audit
- **Opinionated but minimal** — fewer guarantees, clearer boundaries
- **Maintained, not promised** — best-effort upkeep without SLAs

This project exists because the tool should exist — not because it must become a company.

---

## Status

- Actively evolving
- APIs and architecture may change
- No backward-compatibility guarantees prior to v1.0

---

## License

Apache License 2.0.  
See [LICENSE](LICENSE).
