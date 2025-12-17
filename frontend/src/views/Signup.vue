<template>
  <section class="auth">
    <h1>Create your Quieter.ai account</h1>
    <p class="lead">
      Use Quieter as your privacy shield for GPT-style tools — whether you’re here to protect your
      own chats or to give your users a safer way to talk to models.
    </p>

    <p class="steps">
      Getting started is simple:
      <br />
      <strong>1)</strong> Create your account. <strong>2)</strong> Install the Quieter browser
      extension and paste in your API key. <strong>3)</strong> Keep using your usual GPT sites —
      Quieter quietly sits in the middle, hiding your identity and showing you what your AI usage is
      likely costing.
    </p>

    <p class="dev-note">
      Building your own app or tool? You can also use this account to get an API key and follow the
      <RouterLink :to="{ name: 'ApiKeyGuide' }">hosted API key guide</RouterLink>.
    </p>

    <p class="preview-note">
      This is an early-access hosted preview. Billing and long-term availability are not yet
      finalized.
    </p>

    <form class="card" @submit.prevent="onSubmit">
      <p class="blurb">
        We’ll create a private account for you and issue an API key. You can plug this key into the
        Quieter browser extension, your own apps, or other clients that speak to Quieter.
      </p>
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email" />
      </label>

      <label>
        Password
        <input v-model="password" type="password" required autocomplete="new-password" />
      </label>

      <label>
        Project / workspace name (optional)
        <input
          v-model="tenantName"
          type="text"
          placeholder="e.g. My personal notebook, Acme team workspace"
        />
        <span class="field-hint">
          This is how your primary workspace will be labeled inside Quieter. You can use it for your
          own account or as the umbrella for your users.
        </span>
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
          Copy this somewhere safe. You’ll paste it into the Quieter browser extension or your own
          apps so they can send requests through your Quieter shield.
        </p>
      </div>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';

const apiBase = import.meta.env.VITE_API_BASE_URL;
const router = useRouter();

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
      // After successful signup, send the user to the dashboard
      router.push({ name: 'Dashboard' });
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
  margin-bottom: 0.75rem;
}

.steps {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.dev-note {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 0.35rem;
}

.dev-note a {
  color: var(--color-primary);
  text-decoration: underline;
}

.preview-note {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
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

.blurb {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
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

.field-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.hint {
  margin-top: 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
</style>
