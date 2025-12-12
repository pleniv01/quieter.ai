<template>
  <section class="dev">
    <h1>Quieter.ai for developers</h1>
    <p class="lead">
      If you build apps or tools, you can talk to Quieter.ai with a simple HTTP call. We sit in
      front of your GPT provider and handle identity shielding, accounting, and usage analytics.
    </p>

    <div class="card">
      <h2>Basic flow</h2>
      <ol>
        <li>Sign up on the main site and get your <code>qtr_...</code> API key.</li>
        <li>Send prompts to <code>POST /query</code> with <code>Authorization: Bearer &lt;key&gt;</code>.</li>
        <li>Receive the model response, plus latency and usage stats.</li>
      </ol>

      <h3>Example (curl)</h3>
      <pre><code>curl -X POST https://quieteraiapp-production.up.railway.app/query \ 
  -H "Authorization: Bearer {{QUIETER_API_KEY}}" \ 
  -H "Content-Type: application/json" \ 
  -d '{
    "prompt": "Explain what Quieter.ai does.",
    "metadata": { "source": "curl-dev-example" }
  }'</code></pre>

      <p class="note">
        For full details, see the <a href="/docs/how-to-use-quieter-api-key" target="_blank" rel="noopener">API key guide</a>
        and the architecture document in the docs folder.
      </p>
    </div>
  </section>
</template>

<script setup>
</script>

<style scoped>
.dev {
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

.card h2 {
  margin-top: 0;
}

.card h3 {
  margin-top: 1.25rem;
}

ol {
  padding-left: 1.25rem;
  color: var(--color-text-muted);
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

.note {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
