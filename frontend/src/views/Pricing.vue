<template>
  <section class="pricing">
    <header class="hero">
      <p class="eyebrow">Pricing</p>
      <h1>Simple credit-based billing</h1>
      <p class="lead">
        Start with a base subscription for predictable access, add top-ups when you need more. No
        surprise charges if you’re idle.
      </p>
      <div class="actions">
        <RouterLink v-if="isAuthed" to="/dashboard" class="btn primary">Go to dashboard</RouterLink>
        <template v-else>
          <RouterLink to="/signup" class="btn primary">Create an account</RouterLink>
          <RouterLink to="/login" class="btn ghost">Log in</RouterLink>
        </template>
      </div>
    </header>

    <div class="cards">
      <div class="card">
        <p class="eyebrow">Base plan</p>
        <h2>$9.95/mo</h2>
        <p class="muted">Includes 500 credits each month.</p>
        <ul>
          <li>Subscription renews monthly</li>
          <li>Credits roll over in your balance</li>
          <li>No usage = no extra charges</li>
        </ul>
        <RouterLink to="/dashboard" class="btn block">Manage subscription</RouterLink>
      </div>

      <div class="card">
        <p class="eyebrow">Top-ups</p>
        <h2>$9.95 each</h2>
        <p class="muted">Adds 1000 credits on demand.</p>
        <ul>
          <li>One-time charge, no auto-renew</li>
          <li>Use when you’re running low</li>
          <li>Stackable with the base plan</li>
        </ul>
        <RouterLink to="/dashboard" class="btn ghost block">Top up credits</RouterLink>
      </div>
    </div>

    <div class="note">
      <p>
        Want a different split (e.g., more credits per top-up or per month)? We can adjust the credit
        conversion without changing your workflow—just reach out.
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
.pricing {
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
  max-width: 640px;
  margin: 0 0 0.75rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.card {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.2rem 1rem;
  box-shadow: var(--shadow-soft);
}

.card h2 {
  margin: 0.15rem 0 0.2rem;
}

.muted {
  color: var(--color-text-muted);
  margin: 0 0 0.6rem;
}

.card ul {
  margin: 0 0 0.9rem;
  padding-left: 1.1rem;
  color: var(--color-text-muted);
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

.btn.block {
  width: 100%;
  max-width: 100%;
  display: block;
  white-space: normal;
}

.note {
  border: 1px dashed var(--color-border);
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem 1rem;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

@media (max-width: 640px) {
  h1 {
    font-size: 1.6rem;
  }
}
</style>
