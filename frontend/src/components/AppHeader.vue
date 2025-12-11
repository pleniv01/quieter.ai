<template>
  <header class="header">
    <RouterLink to="/" class="brand">
      <img src="/logo-quieter.svg" alt="Quieter.ai logo" class="logo" />
      <div class="brand-text">
        <span class="brand-name">Quieter<span class="dot">.ai</span></span>
        <span class="brand-tagline">Privacy-first AI proxy</span>
      </div>
    </RouterLink>

    <nav class="nav">
      <RouterLink to="/privacy" class="nav-link">Privacy</RouterLink>
      <RouterLink to="/privacy-policy" class="nav-link">Privacy Policy</RouterLink>
    </nav>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid var(--color-border);
  padding: 0.9rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo {
  width: 32px;
  height: 32px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-weight: 700;
  letter-spacing: 0.01em;
}

.brand-name .dot {
  color: var(--color-primary);
}

.brand-tagline {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  transition: background 0.15s, color 0.15s;
}

.nav-link.router-link-active {
  background: var(--color-primary-soft);
  color: #111827;
}
</style>
