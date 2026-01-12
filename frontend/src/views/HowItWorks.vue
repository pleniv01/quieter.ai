<template>
  <section class="how">
    <header class="hero">
      <p class="eyebrow">How it works</p>
      <h1>Get started with Quieter.ai</h1>
      <p class="lead">
        Create an account, install the extension, and use credits as you browse. You can subscribe for
        a base bundle and add top-ups whenever you need more.
      </p>
      <div class="actions">
        <RouterLink v-if="isAuthed" to="/dashboard" class="btn primary">Go to dashboard</RouterLink>
        <template v-else>
          <RouterLink to="/signup" class="btn primary">Create an account</RouterLink>
          <RouterLink to="/login" class="btn ghost">Log in</RouterLink>
        </template>
        <RouterLink to="/pricing" class="btn ghost">See pricing</RouterLink>
      </div>
    </header>

    <div class="steps">
      <div class="step">
        <p class="eyebrow">Step 1</p>
        <h2>Create your account</h2>
        <p class="muted">
          Sign up on the dashboard (takes about a minute). We’ll issue your API key and send you to
          Stripe to start your subscription ($9.95/mo, 500 credits). You can add top-ups any time.
        </p>
      </div>
      <div class="step">
        <p class="eyebrow">Step 2</p>
        <h2>Install the extension</h2>
        <p class="muted">
          Install the Quieter.ai browser extension, then paste your API key into the extension
          settings. When you use Claude.ai (and other supported sites) in your browser, those requests
          will be proxied through Quieter.ai with redaction applied—no need to use a special site.
        </p>
      </div>
      <div class="step">
        <p class="eyebrow">Step 3</p>
        <h2>Add credits</h2>
        <p class="muted">
          From the dashboard, start your monthly subscription (includes 500 credits, bills monthly).
          Need more? Add top-ups (1000 credits each) whenever you’re low—no extra renewal required.
          Already subscribed? Just top up when you need more.
        </p>
      </div>
      <div class="step">
        <p class="eyebrow">Step 4</p>
        <h2>Use and monitor</h2>
        <p class="muted">
          Keep using Claude.ai and other supported sites with the extension enabled. Watch your
          balance and last payment on the dashboard and top up whenever you’re low. No usage charges
          if you’re idle (subscription still renews monthly).
        </p>
      </div>
    </div>

    <div class="account-note">
      <p>
        Note: your Quieter usage is tied to the <strong>Quieter account</strong> and its
        <code>qtr_...</code> API key. Your Claude login and your Anthropic API key are separate.
        Make sure you’re signed in to the Quieter account whose usage you want to track.
      </p>
    </div>

    <div class="note">
      <p>
        Need a different credit split or have integration questions? Reach out—we can adjust the
        conversion without changing your workflow.
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { RouterLink } from 'vue-router';

const isAuthed = ref(false);
const syncAuthState = () => {
  isAuthed.value = Boolean(localStorage.getItem('quieterAccountId'));
};

onMounted(() => {
  syncAuthState();
  window.addEventListener('storage', syncAuthState);
  window.addEventListener('quieter-auth-changed', syncAuthState);
});

onBeforeUnmount(() => {
  window.removeEventListener('storage', syncAuthState);
  window.removeEventListener('quieter-auth-changed', syncAuthState);
});
</script>

<style scoped>
.how {
  max-width: 960px;
  margin: 0 auto;
}

.hero {
  margin-bottom: 2rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin: 0 0 0.4rem;
}

h1 {
  margin: 0 0 0.5rem;
  font-size: 2rem;
}

.lead {
  color: var(--color-text-muted);
  max-width: 680px;
  margin: 0 0 0.75rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.step {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem 1rem;
  box-shadow: var(--shadow-soft);
}

.step h2 {
  margin: 0.1rem 0 0.2rem;
  font-size: 1.1rem;
}

.muted {
  color: var(--color-text-muted);
  margin: 0 0 0.2rem;
  font-size: 0.95rem;
}

.btn {
  display: inline-block;
  text-align: center;
  border-radius: 10px;
  padding: 0.55rem 0.95rem;
  font-weight: 600;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  background: #fff;
  box-sizing: border-box;
}

.btn.primary {
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #111827;
  border: none;
}

.btn.ghost {
  background: transparent;
}

.note {
  border: 1px dashed var(--color-border);
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem 1rem;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.account-note {
  border: 1px dashed var(--color-border);
  background: #f9fafb;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin: 1.2rem 0;
}

.account-note code {
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  h1 {
    font-size: 1.6rem;
  }
}
</style>
