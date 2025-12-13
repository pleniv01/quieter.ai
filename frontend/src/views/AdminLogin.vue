<template>
  <section class="admin">
    <h1>Admin access</h1>
    <p class="lead">
      This simple admin view is only for you. Paste your admin token to manage models.
    </p>

    <div class="card">
      <label>
        Admin token
        <input v-model="token" type="password" autocomplete="off" />
      </label>
      <button type="button" @click="login" :disabled="loading">
        {{ loading ? 'Checking…' : 'Continue to models' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const apiBase = import.meta.env.VITE_API_BASE_URL;
const token = ref(localStorage.getItem('quieterAdminToken') || '');
const loading = ref(false);
const error = ref('');
const router = useRouter();

async function login() {
  error.value = '';
  if (!token.value) {
    error.value = 'Token is required';
    return;
  }
  loading.value = true;
  try {
    const res = await fetch(`${apiBase}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Login failed (${res.status})`);
    }
    localStorage.setItem('quieterAdminToken', token.value);
    router.push({ name: 'AdminModels' });
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Admin login failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.admin {
  max-width: 480px;
  margin: 0 auto;
}

.lead {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-soft);
  padding: 1.4rem 1.2rem;
}

label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

input[type='password'] {
  width: 100%;
  margin-top: 0.25rem;
}

button {
  margin-top: 0.5rem;
}

.error {
  margin-top: 0.75rem;
  color: #b91c1c;
  font-size: 0.85rem;
}
</style>
