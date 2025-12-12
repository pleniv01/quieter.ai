<template>
  <section class="auth">
    <h1>Log in to Quieter.ai</h1>
    <p class="lead">
      Log in to view your account details and usage.
    </p>

    <form class="card" @submit.prevent="onSubmit">
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email" />
      </label>

      <label>
        Password
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Logging in…' : 'Log in' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="info" class="info">{{ info }}</p>
    </form>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const apiBase = import.meta.env.VITE_API_BASE_URL;
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const info = ref('');

onMounted(() => {
  const existingId = localStorage.getItem('quieterAccountId');
  const existingEmail = localStorage.getItem('quieterEmail');
  if (existingId) {
    // If you are already logged in, skip the login form and go to the dashboard.
    router.push({ name: 'Dashboard' });
    return;
  }

  if (existingEmail) {
    info.value = `Use your Quieter.ai credentials to log in.`;
  }
});

async function onSubmit() {
  error.value = '';
  loading.value = true;

  try {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Login failed (${res.status})`);
    }

    const data = await res.json();
    if (data.accountId) {
      localStorage.setItem('quieterAccountId', data.accountId);
      localStorage.setItem('quieterEmail', data.email || email.value);
      // After successful login, go straight to the dashboard
      router.push({ name: 'Dashboard' });
    }
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Login failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth {
  max-width: 520px;
  margin: 0 auto;
}

.lead {
  color: var(--color-text-muted);
  margin-bottom: 1.25rem;
}

.card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-soft);
  padding: 1.8rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  gap: 0.25rem;
}

input {
  font-size: 0.95rem;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

button {
  margin-top: 0.5rem;
  align-self: flex-start;
  border-radius: 999px;
  padding: 0.5rem 1.2rem;
  border: none;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #111827;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
  cursor: default;
}

.error {
  color: #b91c1c;
  font-size: 0.85rem;
}

.info {
  margin-top: 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
</style>
