# Quieter.ai Browser Extension / Desktop Agent Design (Draft)

This document outlines the initial design for a Quieter.ai browser extension (and later desktop agent) that routes GPT-style traffic through the Quieter.ai privacy shield.

## Goals

- Make it easy for non-developers to use Quieter.ai with existing GPT-based tools.
- Ensure providers only see Quieter.ai as the caller, not the end user (identity shielding).
- Keep sensitive content as local as possible and apply optional scrubbing as a secondary layer.
- Keep the API contract to the backend stable and minimal.

## High-Level Flow

### Actors

- **User** – running in a browser or desktop environment.
- **Extension/Agent** – Quieter.ai code running on the user’s machine.
- **Quieter.ai API** – the proxy + accounting backend (Railway app).
- **Model Provider** – Anthropic/OpenAI/etc, seen only by Quieter.ai.

### Request Path

1. User enters a prompt into some GPT UI (or a Quieter-specific UI).
2. Extension/agent:
   - Captures the prompt.
   - Adds minimal metadata (e.g. source page, app, approximate context).
   - Retrieves stored Quieter API key.
3. Extension/agent sends a POST to:

   ```text
   POST https://quieteraiapp-production.up.railway.app/query
   Authorization: Bearer <qtr_...>
   Content-Type: application/json
   ```

   Body:

   ```json
   {
     "prompt": "...user text...",
     "metadata": {
       "source": "browser-extension",
       "page_url": "https://example.com/some-app",
       "client": "quieter-extension",
       "client_version": "0.1.0"
     }
   }
   ```

4. Quieter.ai backend:
   - Authenticates via API key → resolves tenant.
   - Optionally scrubs prompt (current regex-based scrubber).
   - Forwards scrubbed prompt to provider.
   - Logs usage and redactions.
   - Returns model response to extension.
5. Extension/agent injects the model response back into the UI (or shows its own panel).

## API Contract for `/query` (from extension/agent)

### Request

- **Method:** `POST`
- **Path:** `/query`
- **Headers:**
  - `Authorization: Bearer <QUIETER_API_KEY>`
  - `Content-Type: application/json`
- **Body fields:**
  - `prompt` (string, required)
  - `metadata` (object, optional)
  - `model` (string, optional – Quieter can default this)

Minimal example:

```json
{
  "prompt": "Help me rewrite this paragraph more clearly.",
  "metadata": {
    "source": "browser-extension",
    "page_url": "https://chat.openai.com/",
    "client": "quieter-extension",
    "client_version": "0.1.0"
  }
}
```

### Response (from Quieter.ai)

- **Status:** `200 OK` on success.
- **Body:**

```json
{
  "ok": true,
  "prompt": "...scrubbed prompt...",
  "metadata": { "source": "browser-extension", "page_url": "..." },
  "model": "claude-3-5-haiku-latest",
  "latencyMs": 123,
  "modelResponse": "...assistant text..."
}
```

Error responses:

- Auth failure → `401` / `403` with `{ ok: false, error: "..." }`.
- Validation failure → `400` with `{ ok: false, error: "Missing or invalid \"prompt\"" }`.
- Provider error → `500` with `{ ok: false, error: "Query failed" }`.

## Extension / Agent Responsibilities

### 1. Key Storage

- Store the Quieter API key in an extension-safe store:
  - Browser: extension storage (e.g. `chrome.storage.sync` / `browser.storage.local`).
  - Desktop: OS keychain or encrypted local config.
- Do **not** embed the key in any bundled JS or HTML.
- Provide a settings UI where the user can paste/rotate their API key.

### 2. Network Routing

Depending on the target app, the extension can:

- **Overlay UI mode (simplest, v1):**
  - Provide its own small text area and "Send via Quieter" button.
  - Does not attempt to intercept existing GPT traffic; just co-exists.
- **Rewrite mode (later):**
  - Intercept `fetch`/XHR calls to known GPT endpoints.
  - Replace their target URL with the Quieter `/query` endpoint.
  - Optionally translate OpenAI-style payloads into Quieter’s simpler `prompt` + `metadata` format.

For early versions, overlay UI is safer and easier to reason about; rewrite mode can come once we have more specific targets.

### 3. Privacy & Scrubbing

- The extension should **not** implement heavy scrubbing logic locally initially; Quieter.ai already runs a scrubber.
- However, the extension can implement *very coarse* local checks for obvious secrets (e.g. private keys, seed phrases) and
  warn the user before sending, especially in overlay mode.
- All detailed scrubbing and redaction counting should remain on the server side to keep logic in one place.

### 4. UX Outline (Browser Extension)

- **Popup / Options page:**
  - Field: `Quieter API key` (masked input).
  - Button: `Test connection` (calls `/me/usage` using a temporary test endpoint or just `/query` with a test prompt).
  - Display: basic usage summary (from `/me/usage`), e.g. "N conversations shielded".
- **On-page UI:**
  - Small floating button or sidebar for "Ask via Quieter".
  - Text area + submit; result rendered inline.

No login/password for Quieter in the extension; it only uses the API key you obtained from the web app.

## Desktop Agent Variant

A desktop agent (e.g. menu bar app) would:

- Use the same `/query` API contract.
- Provide a text box and hotkey for sending prompts through Quieter.
- Optionally expose a local HTTP proxy or OpenAI-compatible shim for dev tools.

The main differences are:

- Storage location for the key (OS keychain vs extension storage).
- How it integrates with apps (hotkeys, clipboard, local proxy) vs DOM injection.

## Future Considerations

- **Per-profile selection:**
  - When multi-profile is supported, the extension could allow choosing a profile (tenant) per context.
- **Per-profile config:**
  - Respect `scrub_mode` or exfil alert settings once those exist.
- **Provider-compat adapters:**
  - Optionally accept OpenAI-style payloads in the extension and translate to Quieter’s contract.

For now, the key is to keep the `/query` contract stable and simple, and design the extension around it: capture prompt, attach light metadata, send with `Authorization: Bearer <key>`, render response.