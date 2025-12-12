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
        <span v-if="profileName">Profile: <strong>{{ profileName }}</strong></span>
        <span v-else>Profile: <strong>Default tenant</strong></span><br />
        Account ID: <code>{{ accountId }}</code>
      </p>

      <div class="profile-card" v-if="usage">
        <h2>Profile settings (read-only for now)</h2>
        <p>
          <strong>Profile name:</strong> {{ profileName || 'Default tenant' }}<br />
          <strong>Total profiles for this account:</strong> {{ tenantCount }}
        </p>
        <p class="profile-note">
          Quieter.ai currently uses a single profile per account by default. In the future, you’ll be
          able to manage multiple profiles/workspaces and configure alerts per profile.
        </p>
      </div>

      <button type="button" @click="loadUsage" :disabled="loading">
        {{ loading ? 'Loading usage…' : 'Refresh usage' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>

      <dl v-if="usage" class="stats">
        <div>
          <dt>Conversations shielded</dt>
          <dd>{{ usage.totalRequests }}</dd>
        </div>
        <div>
          <dt>Approx. private tokens</dt>
          <dd>{{ usage.totalTokens }}</dd>
        </div>
        <div>
          <dt>Total latency (ms)</dt>
          <dd>{{ usage.totalLatencyMs }}</dd>
        </div>
        <div>
          <dt>Extra shield hits (redactions)</dt>
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
const profileName = ref('');
const tenantCount = ref(0);

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
    const data = await res.json();
    usage.value = data;
    profileName.value = data.primaryTenantName || '';
    tenantCount.value = data.tenantCount || 0;
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

.profile-card {
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  border: 1px dashed var(--color-border);
  background: #f9fafb;
  font-size: 0.9rem;
}

.profile-card h2 {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.profile-note {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
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
