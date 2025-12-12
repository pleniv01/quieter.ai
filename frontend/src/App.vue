<script setup>
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.app-main {
  flex: 1;
  padding: 1.75rem 1.1rem 2.5rem;
  max-width: 960px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .app-main {
    padding: 1.25rem 0.9rem 2rem;
  }
}
</style>
