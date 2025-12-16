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
</style>
