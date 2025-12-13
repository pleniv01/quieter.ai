<template>
  <section class="guide">
    <h1>How to Use Your Quieter.ai API Key</h1>
    <p class="lead">
      This page explains what your Quieter.ai API key is, how to keep it safe, and how to use it to
      send traffic through the Quieter.ai privacy shield.
    </p>

    <div class="card">
      <h2>1. What your API key is</h2>
      <p>
        When you sign up for Quieter.ai, we generate a tenant-specific API key that looks like this:
      </p>
      <pre><code>qtr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code></pre>
      <p>
        This key identifies <strong>your account + profile</strong> to the Quieter.ai backend. All
        usage and billing are tracked against it. Treat it like a password.
      </p>

      <h2>2. Where to find your key</h2>
      <p>
        Right now, the key is shown once on successful signup in the web UI and is returned from the
        <code>/auth/signup</code> endpoint as <code>apiKey</code>. In the future, there will be a
        dedicated "Account / API Keys" page where you can view, rotate, and revoke keys.
      </p>

      <h2>3. Base URL for the Quieter API</h2>
      <p>Production API base:</p>
      <pre><code>https://quieteraiapp-production.up.railway.app</code></pre>

      <h2>4. Sending a request with your API key</h2>
      <p>The main authenticated endpoint today is <code>POST /query</code>.</p>
      <p>You must send your key in the <code>Authorization</code> header using the Bearer scheme.</p>

      <h3>Example (curl)</h3>
      <pre><code>curl -X POST https://quieteraiapp-production.up.railway.app/query \
  -H "Authorization: Bearer {{QUIETER_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain what Quieter.ai does in one paragraph.",
    "metadata": { "source": "curl-doc-example" }
  }'</code></pre>

      <h3>Example (JavaScript)</h3>
      <pre><code>async function callQuieter(prompt) {
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
}</code></pre>

      <h2>5. Good practices</h2>
      <ul>
        <li><strong>Keep it secret.</strong> Treat your key like a password.</li>
        <li>
          <strong>Don’t embed it in frontend bundles.</strong> Use environment variables, extension
          storage, or keychains instead.
        </li>
        <li>
          <strong>Rotate it</strong> if you think it was exposed (e.g., pasted into a public repo).
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
</script>

<style scoped>
.guide {
  max-width: 720px;
  margin: 0 auto;
}

.lead {
  color: var(--color-text-muted);
  margin-bottom: 1.25rem;
}

.card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-soft);
  padding: 1.8rem 1.6rem;
  font-size: 0.95rem;
}

h2 {
  margin-top: 1.2rem;
}

pre {
  margin-top: 0.75rem;
  padding: 0.7rem 0.9rem;
  background: #0f172a;
  color: #e5e7eb;
  border-radius: 8px;
  font-size: 0.8rem;
  overflow-x: auto;
}

ul {
  margin-top: 0.75rem;
  padding-left: 1.25rem;
  color: var(--color-text-muted);
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
}
</style>
