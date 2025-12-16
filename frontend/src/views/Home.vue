<template>
  <section class="hero">
    <div class="hero-card">
      <h1>Quieter.ai</h1>
      <p class="subtitle">
        Use AI without handing your life story to every provider. Quieter.ai sits between you and
        GPT-style models so they only ever see Quieter — not you.
      </p>
      <div class="badge-row">
        <span class="badge">Private by default · Easy to use · Works with your favorite GPT UIs*</span>
      </div>
      <p class="note">
        Today, you can use a Quieter.ai instance as a privacy layer between you and GPT-style
        models. A small browser extension can sit between you and your usual GPT sites,
        quietly routing those conversations through Quieter so the models see Quieter, not you.
      </p>
      <div class="cta-row">
        <RouterLink to="/signup" class="cta cta-primary">Use hosted Quieter.ai</RouterLink>
        <RouterLink to="/developers" class="cta cta-secondary">Self-host & open source</RouterLink>
      </div>
    </div>
  </section>

  <section class="who">
    <h2>Who Quieter.ai is for</h2>
    <ul>
      <li>People who journal or vent to AI and don’t want those stories tied to their real identity</li>
      <li>Students and researchers who want private drafts, questions, and experiments</li>
      <li>Professionals who use AI for work notes or planning but can’t leak client details</li>
      <li>Anyone who likes AI’s help but hates the feeling of being tracked and logged</li>
      <li>
        Anyone curious what their GPT habit actually costs — per query, per day, or per week —
        instead of just paying a flat subscription and guessing
      </li>
    </ul>
    <p class="note">
      You can use this site to sign up for the hosted Quieter.ai service today and start routing
      your GPT-style traffic through a privacy shield. If you prefer to run everything yourself,
      Quieter is also open source and can be self-hosted.
    </p>
    <p class="note">
      Along the way, Quieter gives you a rough sense of what each interaction costs — per query, per
      day, or per week — and, over time, across different GPTs. You can see when a "throwaway"
      question is quietly burning real money, and which sessions and tools are actually worth the
      spend.
    </p>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.hero {
  display: flex;
  justify-content: center;
}

.hero-card {
  background: #ffffff;
  border-radius: var(--color-radius-lg, 18px);
  box-shadow: var(--shadow-soft);
  padding: 2.25rem 1.9rem;
  border: 1px solid rgba(0, 0, 0, 0.03);
  max-width: 720px;
  border-top: 4px solid var(--color-primary);
  font-family: var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
}

h1 {
  font-size: 2.1rem;
  margin-bottom: 0.75rem;
  letter-spacing: -0.01em;
}

.subtitle {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-text-muted);
  margin-bottom: 1.25rem;
}

.badge-row {
  margin-bottom: 1.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: #7c2d12;
  font-size: 0.8rem;
  font-weight: 600;
}

.cta-row {
  margin-top: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 1.1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid transparent;
}

.cta-primary {
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #111827;
}

.cta-secondary {
  background: #ffffff;
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.note {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.who {
  margin-top: 2.75rem; /* more vertical space below hero card */
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 1.25rem; /* horizontal inset so text doesn't hug the card edge */
}

.who ul {
  margin: 0.75rem 0 0.5rem;
  padding-left: 1.6rem; /* a bit more horizontal indent from the edge */
  color: var(--color-text-muted);
}

.who li + li {
  margin-top: 0.35rem;
}

.who .note {
  margin-top: 0.75rem; /* extra vertical gap between bullets and statement */
}

@media (max-width: 640px) {
  .hero-card {
    padding: 1.75rem 1.4rem;
  }

  .cta-row {
    flex-direction: column;
    align-items: stretch;
  }

  h1 {
    font-size: 1.85rem;
  }

  .subtitle {
    font-size: 0.98rem;
  }

  .who {
    margin-top: 2.1rem;
    padding: 0 0.5rem;
  }

  .who ul {
    padding-left: 1.25rem;
  }
}
</style>
