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
      <RouterLink to="/pricing" class="nav-link">Pricing</RouterLink>
      <RouterLink to="/privacy" class="nav-link">Privacy</RouterLink>
      <RouterLink to="/developers" class="nav-link">Open source</RouterLink>
      <RouterLink to="/dashboard" class="nav-link">Dashboard</RouterLink>
      <template v-if="!accountId">
        <RouterLink to="/signup" class="nav-link">Sign up</RouterLink>
        <RouterLink to="/login" class="nav-link">Log in</RouterLink>
      </template>
      <template v-else>
        <span class="nav-user">{{ email || 'Account' }}</span>
        <button class="nav-link nav-logout" type="button" @click="logout">Log out</button>
      </template>
    </nav>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

const router = useRouter();

const accountId = computed(() => localStorage.getItem('quieterAccountId') || '');
const email = computed(() => localStorage.getItem('quieterEmail') || '');

function clearLocalAccount() {
  try {
    localStorage.removeItem('quieterAccountId');
    localStorage.removeItem('quieterEmail');
    localStorage.removeItem('quieterAdminToken');
  } catch (e) {
    console.error('Failed to clear local account state', e);
  }
}

function logout() {
  clearLocalAccount();
  // Use a hard redirect to guarantee state is cleared even if the router is unhappy.
  window.location.href = '/';
}
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid var(--color-border);
  padding: 0.7rem 1rem;
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
  gap: 0.75rem;
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

.nav-user {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.nav-logout {
  background: transparent;
  border: 1px solid var(--color-border);
  cursor: pointer;
}

@media (max-width: 640px) {
  .header {
    padding: 0.6rem 0.75rem;
    gap: 0.5rem;
  }

  .brand-text {
    display: none;
  }

  .nav {
    gap: 0.5rem;
  }

  .nav-link {
    font-size: 0.8rem;
    padding: 0.2rem 0.45rem;
  }

  .nav-user {
    display: none;
  }
}
</style>
