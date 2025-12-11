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
      network, your keys, and the shape of your traffic. A normal proxy can hide your IP
      address — but it can’t hide <em>who</em> is really behind the request.
    </p>

    <p>
      <strong>Quieter.ai was built to fix that.</strong>
    </p>

    <section class="panel panel-highlight">
      <h2>More than a proxy. A true identity shield.</h2>
      <p>
        With Quieter.ai in the middle, GPT providers only ever see Quieter.ai’s IPs and API
        keys, not your users or your infrastructure.
      </p>
      <p>
        Your app → Quieter.ai → GPT provider. The model never sees your tenant’s network,
        cookies, or accounts.
      </p>
    </section>

    <section class="panel">
      <h2>What Quieter.ai removes or replaces</h2>

      <p class="clarify">
        The core of Quieter.ai is network identity shielding: GPT providers see Quieter.ai’s
        IPs and keys, not yours. On top of that, you can optionally enable extra content
        scrubbing, which further reduces what leaks into model logs.
      </p>

      <article class="item">
        <h3>1. Personal Identifiers (optional scrub layer)</h3>
        <p>
          Proxies pass through whatever your app sends. When Quieter’s scrub layer is turned
          on, it can strip names, emails, usernames, account references, session IDs, and
          similar metadata before anything reaches the AI model.
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
        <h3>3. Unintended identity in your content (optional scrub layer)</h3>
        <p>If your app or browser accidentally includes:</p>
        <ul>
          <li>“User: Sarah T.”</li>
          <li>“My student ID is…”</li>
          <li>“Here’s my private note attached to the prompt…”</li>
        </ul>
        <p>
          A proxy will forward it upstream unchanged. With Quieter’s scrub layer enabled,
          those patterns can be intercepted, anonymized, or blocked <em>in addition to</em>
          the identity shield you get by default.
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
