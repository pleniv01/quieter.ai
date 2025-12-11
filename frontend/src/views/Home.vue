<template>
  <section class="hero">
    <div class="hero-card">
      <h1>Quieter.ai</h1>
      <p class="subtitle">
        A privacy shield for AI — keeping your identity and context out of the model.
      </p>
      <div class="badge-row">
        <span class="badge">Vue · Vite · Netlify · Railway</span>
      </div>
      <p class="note">
        Start by exploring how we protect you on the
        <RouterLink to="/privacy">Privacy</RouterLink> page.
      </p>
    </div>
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
  border-radius: var(--color-radius-lg, 14px);
  box-shadow: var(--shadow-soft);
  padding: 2.5rem 2.25rem;
  border: 1px solid var(--color-border);
  max-width: 720px;
}

h1 {
  font-size: 2.4rem;
  margin-bottom: 0.75rem;
}

.subtitle {
  font-size: 1.05rem;
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

.note {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
</style>
