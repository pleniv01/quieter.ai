<template>
  <footer class="footer">
    <div class="footer-left">
      <span class="brand">Quieter.ai</span>
      <span class="year">© {{ year }}</span>
    </div>
    <div class="footer-links">
      <RouterLink to="/privacy">Privacy</RouterLink>
      <RouterLink to="/privacy-policy">Privacy Policy</RouterLink>
    </div>
  </footer>
</template>

<script setup>
import { RouterLink } from 'vue-router';

const year = new Date().getFullYear();
</script>

<style scoped>
.footer {
  border-top: 1px solid var(--color-border);
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}

.footer-left {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.footer-links {
  display: flex;
  gap: 1rem;
}
</style>
