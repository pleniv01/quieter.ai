<template>
  <section class="dev">
    <h1>Open source and self-hosting</h1>
    <p class="lead">
      Quieter.ai is an open-source reference implementation of a privacy shield for GPT-style
      models. It is designed to be run on your own infrastructure, with your own database and
      model API keys.
    </p>

    <div class="card">
      <h2>Project model</h2>
      <p>
        Quieter is a small, focused codebase that shows how to put a privacy-aware proxy in front
        of large language models. The reference implementation is published under the
        <strong>Apache 2.0</strong> license so you can review, adapt, and deploy it for your own
        use.
      </p>
      <p>
        Each deployment of Quieter is expected to run its own infrastructure: a web process, a
        database, and one or more LLM provider API keys. The maintainer of this project does not
        operate a shared proxy or relay for third-party deployments.
      </p>
    </div>

    <div class="card">
      <h2>Self-hosting</h2>
      <p>
        The recommended way to use Quieter is to self-host it for yourself or your organisation.
        You keep control of:
      </p>
      <ul>
        <li>Where the service runs (for example, your own cloud account)</li>
        <li>Which database it uses and how long logs are retained</li>
        <li>Which model providers and API keys are configured</li>
      </ul>
      <p>
        The repository includes a minimal reference configuration and notes in
        <code>SELF_HOSTING.md</code>. You are free to integrate Quieter into your own stack or
        deployment model.
      </p>
    </div>

    <div class="card">
      <h2>Hosted instances</h2>
      <p>
        You may choose to run a hosted instance of Quieter for yourself, your team, or your own
        end-users. Any such instance is responsible for its own reliability, security, and data
        handling. This project does not describe or imply a shared, centrally operated service for
        other parties.
      </p>
      <p>
        A hosted instance is multitenant-capable: you can create an account, obtain an API key, and
        build your own user-facing product or "universe" of users on top of Quieter.
      </p>
      <p>
        If you expose a hosted instance to others, we recommend being clear about where it runs,
        which model providers it uses, and how logs are handled.
      </p>
    </div>

    <div class="card">
      <h2>Source code and contact</h2>
      <p>
        The source is available on GitHub at
        <a href="https://github.com/pleniv01/quieter.ai" target="_blank" rel="noopener noreferrer">
          github.com/pleniv01/quieter.ai
        </a>.
      </p>
      <p>
        For questions about the codebase, licensing, or responsible use, you can reach the
        maintainer at <a href="mailto:quieter@quieter.ai">quieter@quieter.ai</a>.
      </p>
      <p class="note">
        <strong>Optional attribution:</strong> If you deploy or redistribute Quieter and are able to
        do so, a small “Powered by Quieter.ai” attribution is appreciated and helps support the
        project’s continued development.
      </p>
    </div>
  </section>
</template>

<script setup>
// No router links are required on this page at the moment.
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
