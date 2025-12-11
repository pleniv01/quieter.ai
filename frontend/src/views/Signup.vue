<template>
  <section class="auth">
    <h1>Create a Quieter.ai account</h1>
    <p class="lead">
      Sign up to get an API key you can use with the browser extension or other clients.
    </p>

    <form class="card" @submit.prevent="onSubmit">
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email" />
      </label>

      <label>
        Password
        <input v-model="password" type="password" required autocomplete="new-password" />
      </label>

      <label>
        Tenant name (optional)
        <input v-model="tenantName" type="text" placeholder="My GPT Shield" />
      </label>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Creating account…' : 'Sign up' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="apiKey" class="success">
        <p><strong>Account created.</strong></p>
        <p>
          Here is your Quieter.ai API key:
          <code>{{ apiKey }}</code>
        </p>
        <p class="hint">
          Store this somewhere safe. You will paste it into the browser extension or other
          Quieter.ai clients.
        </p>
      </div>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue';

const apiBase = import.meta.env.VITE_API_BASE_URL;

const email = ref('');
const password = ref('');
const tenantName = ref('');
const loading = ref(false);
const error = ref('');
const apiKey = ref('');

async function onSubmit() {
  error.value = '';
  apiKey.value = '';
  loading.value = true;

  try {
    const res = await fetch(`${apiBase}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value, tenantName: tenantName.value }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Signup failed (${res.status})`);
    }

    const data = await res.json();
    apiKey.value = data.apiKey || '';
    if (data.accountId) {
      localStorage.setItem('quieterAccountId', data.accountId);
      localStorage.setItem('quieterEmail', email.value);
    }
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Signup failed.';
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

.success {
  margin-top: 0.75rem;
  font-size: 0.9rem;
}

code {
  display: inline-block;
  margin-top: 0.25rem;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  background: #f3f4f6;
}

.hint {
  margin-top: 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
</style>
