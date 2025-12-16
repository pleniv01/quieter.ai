# How to Use Your Quieter.ai API Key

This document explains what your Quieter.ai API key is, how to keep it safe, and how to use it to send traffic through the Quieter.ai privacy shield.

---

## 1. What your API key is

When you sign up for Quieter.ai, we generate a tenant-specific API key that looks like this:

```text
qtr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

This key identifies **your account + tenant** to the Quieter.ai backend. All usage and billing are tracked against it.

**Never share this key publicly.** Anyone with the key can send traffic through Quieter.ai on your behalf.

---

## 2. Where to find your API key

Right now, the API key is shown once on successful signup in the web UI and is returned from the `/auth/signup` endpoint as `apiKey`.

In the future, there will be a dedicated "Account" / "API Keys" page where you can:

- View active keys
- Rotate/revoke keys

For now, store the key somewhere safe (e.g. a password manager) when you sign up.

---

## 3. Base URL for the Quieter API

All examples below assume the production API is running at:

```text
https://quieteraiapp-production.up.railway.app
```

If this changes, update the base URL accordingly.

---

## 4. Sending a request with your API key

The main authenticated endpoint today is:

```text
POST /query
```

You must send your API key in the `Authorization` header using the `Bearer` scheme.

### 4.1. Example with curl

```bash
curl -X POST https://quieteraiapp-production.up.railway.app/query \
  -H "Authorization: Bearer {{QUIETER_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain what Quieter.ai does in one paragraph.",
    "metadata": { "source": "curl-doc-example" }
  }'
```

Replace `{{QUIETER_API_KEY}}` with your actual key (starting with `qtr_`).

If the request succeeds, you should see a JSON response similar to:

```json
{
  "ok": true,
  "prompt": "...scrubbed prompt...",
  "metadata": { ... },
  "model": "claude-3-5-haiku-latest",
  "latencyMs": 123,
  "modelResponse": "..."
}
```

### 4.2. Example from JavaScript (browser or Node)

```js
async function callQuieter(prompt) {
  const apiKey = process.env.QUIETER_API_KEY; // or load from a secure store

  const res = await fetch('https://quieteraiapp-production.up.railway.app/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      metadata: { source: 'js-example' },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Quieter.ai request failed: ${res.status} ${errorBody}`);
  }

  return res.json();
}
```

**Important:**

- In a browser extension or desktop app, **never hard-code the API key in the public bundle**. Load it from extension storage, an encrypted config, or an OS keychain.
- In a backend service, keep the key in environment variables or a secret manager.

---

## 5. How Quieter.ai uses your key internally

When you call `/query` with your API key:

1. The backend hashes your key (`SHA-256`) and looks up the matching tenant in the `tenants` table.
2. If the key is valid, the request is associated with your tenant.
3. Your prompt is scrubbed for sensitive identifiers (emails, SSNs, certain financial and medical patterns, etc.).
4. The scrubbed prompt is sent to the underlying model provider (e.g., Anthropic) from Quieter.ai's infrastructure.
5. Usage (latency, approximate tokens, and in future redactions) is logged in `usage_logs` for your tenant.

This means model providers see **Quieter.ai as the caller**, not your original machine or IP. The API key is used purely for **accounting and access control** inside Quieter.ai.

---

## 6. Viewing your usage

The Quieter.ai dashboard uses your account to show usage aggregated across your tenant(s).

1. Log in to the web UI.
2. Go to the **Dashboard** page.
3. There you’ll see:
   - Total requests sent through Quieter.ai
   - Total latency (ms)
   - Approximate total tokens
   - Redactions ("privacy wins")

After you send a few `/query` calls with your API key, refresh the dashboard and you should see the numbers update.

---

## 7. Good practices for handling your API key

- **Keep it secret.** Treat it like a password.
- **Don’t embed it in frontend code** that ships to browsers.
- **Use a password manager** or secrets vault to store it.
- **Rotate it** if you suspect it’s been exposed (rotation tooling is planned).

If you ever think your key was leaked (for example, pasted into a public repo), assume it is compromised and contact support or rotate it as soon as key management is available in the UI.
