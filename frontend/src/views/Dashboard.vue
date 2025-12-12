<template>
  <section class="dash">
    <h1>Account usage</h1>
    <p class="lead">
      This is a simple view of how much you’ve used Quieter.ai with your current account.
    </p>

    <div v-if="!accountId" class="notice">
      <p>No account ID is stored locally. Try signing up or logging in first.</p>
    </div>

    <div v-else class="card">
      <p class="dev-link">
        For implementation details, see the
        <a href="/docs/how-to-use-quieter-api-key" target="_blank" rel="noopener">API key guide</a>.
      </p>
      <p class="meta">
        Signed in as <strong>{{ email || '(unknown email)' }}</strong><br />
        Account ID: <code>{{ accountId }}</code>
      </p>

      <button type="button" @click="loadUsage" :disabled="loading">
        {{ loading ? 'Loading usage…' : 'Refresh usage' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>

      <dl v-if="usage" class="stats">
        <div>
          <dt>Total requests</dt>
          <dd>{{ usage.totalRequests }}</dd>
        </div>
        <div>
          <dt>Total latency (ms)</dt>
          <dd>{{ usage.totalLatencyMs }}</dd>
        </div>
        <div>
          <dt>Total tokens</dt>
          <dd>{{ usage.totalTokens }}</dd>
        </div>
        <div>
          <dt>Redactions (privacy wins)</dt>
          <dd>{{ usage.totalRedactions }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const apiBase = import.meta.env.VITE_API_BASE_URL;

const accountId = ref(localStorage.getItem('quieterAccountId') || '');
const email = ref(localStorage.getItem('quieterEmail') || '');
const usage = ref(null);
const loading = ref(false);
const error = ref('');

async function loadUsage() {
  if (!accountId.value) return;
  error.value = '';
  loading.value = true;

  try {
    const url = new URL(`${apiBase}/me/usage`);
    url.searchParams.set('accountId', accountId.value);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to load usage (${res.status})`);
    }
    usage.value = await res.json();
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Failed to load usage.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (accountId.value) {
    loadUsage();
  }
});
</script>

<style scoped>
.dash {
  max-width: 720px;
  margin: 0 auto;
}

.lead {
  color: var(--color-text-muted);
  margin-bottom: 1.25rem;
}

.notice {
  background: #fefce8;
  border-radius: 12px;
  border: 1px solid #fbbf24;
  padding: 1rem 1.2rem;
  font-size: 0.9rem;
}

.card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-soft);
  padding: 1.8rem 1.6rem;
}

.meta {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.dev-link {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.dev-link a {
  color: #155e75;
}

button {
  border-radius: 999px;
  padding: 0.4rem 1.1rem;
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
  margin-top: 0.75rem;
  color: #b91c1c;
  font-size: 0.85rem;
}

.stats {
  margin-top: 1.25rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem 1.5rem;
}

.stats dt {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.stats dd {
  margin: 0.15rem 0 0;
  font-size: 1.1rem;
}

code {
  font-size: 0.8rem;
}
</style>
