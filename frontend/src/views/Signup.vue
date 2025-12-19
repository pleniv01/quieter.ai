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

    <form class="card" @submit.prevent="onSubmit">
      <p class="blurb">
        We’ll create a private account, issue your API key, and start the subscription checkout
        ($9.95/mo, includes 500 credits). You can add top-ups (1000 credits) any time after that.
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
        {{ loading ? 'Preparing checkout…' : 'Sign up and subscribe' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="apiKey" class="success">
        <p><strong>Account created. Almost there!</strong></p>
        <p>
          Your Quieter.ai API key (for the browser extension):
          <code>{{ apiKey }}</code>
        </p>
        <ol class="next-steps">
          <li>Copy the key above.</li>
          <li>Install the Quieter browser extension.</li>
          <li>Paste the key into the extension settings.</li>
          <li>Click “Continue to Stripe” to activate your subscription (500 credits included).</li>
        </ol>
        <p class="hint">
          After checkout, use Claude.ai (and other supported sites) in your browser with the extension
          enabled—your requests will flow through Quieter.
        </p>
        <button type="button" class="secondary" :disabled="!checkoutUrl" @click="goToStripe">
          Continue to Stripe
        </button>
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
const checkoutUrl = ref('');

async function onSubmit() {
  error.value = '';
  apiKey.value = '';
  checkoutUrl.value = '';
  loading.value = true;

  try {
    const res = await fetch(`${apiBase}/auth/signup-and-subscribe`, {
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
    checkoutUrl.value = data.url || '';
    if (data.accountId) {
      localStorage.setItem('quieterAccountId', data.accountId);
      localStorage.setItem('quieterEmail', email.value);
      window.dispatchEvent(new Event('quieter-auth-changed'));
      if (!data.url) {
        router.push({ name: 'Dashboard' });
      }
    }
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Signup failed.';
  } finally {
    loading.value = false;
  }
}

function goToStripe() {
  if (checkoutUrl.value) {
    window.location.href = checkoutUrl.value;
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

.next-steps {
  margin: 0.6rem 0 0.75rem;
  padding-left: 1.25rem;
}

.next-steps li {
  margin-bottom: 0.3rem;
}

.secondary {
  margin-top: 0.4rem;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #111827;
  border: none;
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
