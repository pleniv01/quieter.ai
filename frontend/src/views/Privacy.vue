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
      When you use AI, your words can reveal far more than you realize. A standard proxy can
      hide your IP address — but it can’t hide <em>you</em>. It can’t protect your identity
      from slipping into headers, metadata, or the content itself.
    </p>

    <p>
      <strong>Quieter.ai was built to fix that.</strong>
    </p>

    <section class="panel panel-highlight">
      <h2>More than a proxy. A true privacy shield.</h2>
      <p>
        A normal proxy hides your IP. It keeps websites from seeing where you’re coming from.
      </p>
      <p>
        <strong>Quieter.ai hides your identity, your data, and your context.</strong>
        It ensures the AI model never sees who you are — only the text you choose to send.
      </p>
    </section>

    <section class="panel">
      <h2>What Quieter.ai Removes (and a Proxy Doesn’t)</h2>

      <article class="item">
        <h3>1. Personal Identifiers</h3>
        <p>
          Proxies pass through whatever your app sends.
          <strong>Quieter.ai strips names, emails, usernames, account references, session IDs,
          and hidden metadata</strong> before anything reaches the AI model.
        </p>
      </article>

      <article class="item">
        <h3>2. Tracking Noise</h3>
        <p>Modern apps leak identity everywhere:</p>
        <ul>
          <li>Referer headers</li>
          <li>Fingerprinting hints</li>
          <li>Device information</li>
          <li>Cookies</li>
          <li>Authentication tokens</li>
        </ul>
        <p>
          A proxy often forwards these.
          <strong>Quieter.ai deletes them.</strong>
        </p>
      </article>

      <article class="item">
        <h3>3. Unintended identity in your content</h3>
        <p>If your app accidentally includes:</p>
        <ul>
          <li>“User: Sarah T.”</li>
          <li>“My student ID is…”</li>
          <li>“Here’s my private note attached to the prompt…”</li>
        </ul>
        <p>
          A proxy will forward it upstream.
          <strong>Quieter.ai intercepts, sanitizes, anonymizes, or blocks it.</strong>
        </p>
      </article>
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
</style>
