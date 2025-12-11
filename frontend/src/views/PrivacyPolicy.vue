<template>
  <section class="policy">
    <h1>Privacy Policy</h1>
    <p class="lead">
      This is a placeholder for the full Quieter.ai Privacy Policy.
    </p>
    <p>
      We will publish a detailed Privacy Policy here describing how Quieter.ai collects,
      uses, and protects data when you interact with our services and connected AI models.
    </p>
    <p>
      For a conceptual overview of how Quieter.ai protects your identity at the technical
      level, see the <RouterLink to="/privacy">Privacy</RouterLink> page.
    </p>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.policy {
  max-width: 720px;
  margin: 0 auto;
}

.lead {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}
</style>
