<template>
  <section class="privacy">
    <header class="privacy-header">
      <span class="eyebrow">Privacy at the core</span>
      <h1>How Quieter.ai Protects You</h1>
      <p class="subtitle">
        (And why a normal proxy isn’t enough)
      </p>
    </header>

    <p>
      When you use GPT-style models today, they see more than just your text. They see your
      network, your API keys, and the shape of your traffic. A normal proxy can hide your IP
      address — but it cannot fully hide who is behind the request.
    </p>

    <p>
      <strong>Quieter.ai was built to reduce that exposure.</strong>
    </p>

    <p>
      This page describes how a hosted Quieter.ai instance can act as a privacy layer between
      applications and GPT-style models. When self-hosted, Quieter performs the same role using
      your own infrastructure and keys.
    </p>

    <section class="panel panel-highlight">
      <h2>More than a proxy. A true identity boundary.</h2>
      <p>
        With Quieter.ai in the middle, GPT providers see the Quieter instance — not the
        originating user, browser, or application environment.
      </p>
      <p>
        Your app → Quieter.ai → GPT provider.
        The model never sees your tenant’s network, cookies, or upstream authentication context.
      </p>
    </section>

    <section class="panel">
      <h2>What Quieter.ai removes or replaces</h2>
      <p class="clarify">
        The core of Quieter.ai is network identity shielding: GPT providers interact only with the
        Quieter instance, not with end-user devices or application infrastructure. Optional
        content scrubbing layers can further reduce accidental identity leakage.
      </p>

      <article class="item">
        <h3>1. Personal identifiers (optional scrub layer)</h3>
        <p>
          When enabled, Quieter can heuristically remove or replace obvious identifiers such as
          names, email addresses, usernames, and simple session or account references. This layer
          is pattern-based and does not guarantee semantic understanding.
        </p>
      </article>

      <article class="item">
        <h3>2. Tracking and transport metadata</h3>
        <p>Modern applications leak identity through:</p>
        <ul>
          <li>Headers</li>
          <li>Cookies</li>
          <li>Device hints</li>
          <li>Authentication tokens</li>
        </ul>
        <p>
          Quieter removes or normalizes this metadata rather than forwarding it upstream.
        </p>
      </article>

      <article class="item">
        <h3>3. Unintended identity in prompt content (optional scrub layer)</h3>
        <p>If content includes accidental identifiers such as:</p>
        <ul>
          <li>“User: Sarah T.”</li>
          <li>“My student ID is…”</li>
          <li>Embedded private notes or metadata</li>
        </ul>
        <p>
          Quieter can intercept or block these patterns before they reach the model provider. This
          is an additional safety layer, not a substitute for careful prompt design.
        </p>
      </article>
    </section>

    <section class="panel">
      <h2>Important limitations</h2>
      <p>
        Quieter.ai enhances privacy, but it does not guarantee anonymity. Prompt content still
        matters, adversarial fingerprinting is out of scope, and users can still self-identify
        through text.
      </p>
      <p>
        Quieter is designed to reduce exposure, not eliminate risk.
      </p>
    </section>
  </section>
</template>

<script setup>
</script>

<style scoped>
.privacy {
  max-width: 720px;
  margin: 0 auto;
}

.privacy-header {
  margin-bottom: 1.75rem;
}

.eyebrow {
  display: inline-flex;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--color-primary-soft);
  color: #7c2d12;
  font-weight: 600;
}

h1 {
  margin: 0.75rem 0 0.25rem;
  font-size: 2rem;
}

.subtitle {
  margin: 0;
  color: var(--color-text-muted);
}

.clarify {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.panel {
  margin-top: 1.75rem;
  padding: 1.5rem 1.4rem;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: #ffffff;
}

.panel-highlight {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(255, 194, 14, 0.08), rgba(255, 138, 0, 0.03));
}

.item + .item {
  margin-top: 1.25rem;
}

ul {
  margin: 0.5rem 0 0.75rem;
  padding-left: 1.2rem;
}
  demoQuieterView.value = null;
  const prompt = demoPrompt.value.trim();
  if (!prompt) {
    demoError.value = 'Please enter something to send.';
    return;
  }

  demoLoading.value = true;
  try {
    const res = await fetch(`${apiBase}/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, metadata: { source: 'privacy-demo' } }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      demoError.value = data.error || `Demo failed (${res.status})`;
      return;
    }

    demoResponse.value = data.modelResponse || '(No text response returned.)';
    demoDirectView.value = data.demoDirectView || null;
    demoQuieterView.value = data.demoQuieterView || null;
  } catch (e) {
    console.error(e);
    demoError.value = 'Could not reach the Quieter.ai demo right now.';
  } finally {
    demoLoading.value = false;
  }
}
</script>

<style scoped>
.privacy {
  max-width: 720px;
  margin: 0 auto;
}

.clarify {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.privacy-header {
  margin-bottom: 1.75rem;
}

.eyebrow {
  display: inline-flex;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--color-primary-soft);
  color: #7c2d12;
  font-weight: 600;
}

h1 {
  margin: 0.75rem 0 0.25rem;
  font-size: 2rem;
}

.subtitle {
  margin: 0;
  color: var(--color-text-muted);
}

.panel {
  margin-top: 1.75rem;
  padding: 1.5rem 1.4rem;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: #ffffff;
}

.demo {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.demo textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.6rem;
  font-size: 0.9rem;
}

.demo button {
  align-self: flex-start;
  border-radius: 999px;
  padding: 0.4rem 1.1rem;
  border: none;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #111827;
  font-weight: 600;
  cursor: pointer;
}

.demo button:disabled {
  opacity: 0.7;
  cursor: default;
}

.demo-error {
  color: #b91c1c;
  font-size: 0.85rem;
}

.demo-result {
  margin-top: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  background: #f9fafb;
  font-size: 0.9rem;
}

.demo-result h3 {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
}

.demo-details {
  margin-top: 0.75rem;
}

.demo-views {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.demo-views pre {
  margin: 0;
  padding: 0.6rem 0.7rem;
  background: #0f172a;
  color: #e5e7eb;
  border-radius: 6px;
  font-size: 0.8rem;
  overflow-x: auto;
  white-space: pre-wrap;
}

:deep(.hdr-label) {
  font-weight: 600;
}

:deep(.hdr-section) {
  color: #9ca3af;
  font-weight: 600;
}

:deep(.hdr-ip) {
  color: #f97316; /* orange / network identity */
}

:deep(.hdr-fp) {
  color: #38bdf8; /* fingerprinting headers */
}

:deep(.hdr-context) {
  color: #a855f7; /* context / referrer */
}

:deep(.hdr-other) {
  color: #9ca3af;
}

:deep(.hdr-value) {
  color: #e5e7eb;
}

.demo-views h4 {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
}

.demo-explain {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 0.75rem;
  font-size: 0.85rem;
}

.demo-explain ul {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
  color: var(--color-text-muted);
}

.demo-explain h4 {
  margin: 0;
  font-size: 0.9rem;
}

.demo-quote {
  margin: 0.4rem 0;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--color-text-muted);
}

.panel-highlight {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(255, 194, 14, 0.08), rgba(255, 138, 0, 0.03));
}

.item + .item {
  margin-top: 1.25rem;
}

ul {
  margin: 0.5rem 0 0.75rem;
  padding-left: 1.2rem;
}
</style>
