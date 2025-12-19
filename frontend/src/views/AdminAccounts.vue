<template>
  <section class="admin-accounts">
    <h1>Accounts</h1>
    <p class="lead">
      Look up an account by email to see its tenants and balances.
    </p>

    <form class="controls" @submit.prevent="lookup">
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email" />
      </label>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Looking up…' : 'Lookup' }}
      </button>
      <button type="button" class="secondary" @click="loadList" :disabled="loadingList">
        {{ loadingList ? 'Loading…' : 'Load recent' }}
      </button>
      <RouterLink to="/admin/models" class="secondary-link">Back to models</RouterLink>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="create-card">
      <h2>Create account (support)</h2>
      <form class="inline-form" @submit.prevent="createAccount">
        <label>Email <input v-model="createEmail" type="email" required /></label>
        <label>Password <input v-model="createPassword" type="password" required /></label>
        <label>Workspace name <input v-model="createTenant" type="text" /></label>
        <button type="submit" :disabled="creating">{{ creating ? 'Creating…' : 'Create' }}</button>
      </form>
      <p v-if="createResult" class="muted">
        Created: {{ createResult.email }} ({{ createResult.accountId }}); API key: <code>{{ createResult.apiKey }}</code>
      </p>
    </div>

    <div v-if="account" class="result">
      <h2>Account</h2>
      <p>
        <strong>Email:</strong> {{ account.email }}<br />
        <strong>ID:</strong> <code>{{ account.id }}</code>
      </p>
      <div class="actions-row">
        <button @click="resetPassword(account.id)" :disabled="resettingPw">Reset password</button>
        <button @click="rotateApiKey(account.id)" :disabled="rotatingKey">Rotate API key</button>
        <span v-if="rotatedKey" class="muted">New key: <code>{{ rotatedKey }}</code></span>
      </div>

      <div v-if="usageSummary" class="usage-box">
        <h3>Usage summary</h3>
        <p class="muted">
          Requests: {{ usageSummary.totalRequests }} |
          Tokens: {{ usageSummary.totalTokens.toLocaleString() }} |
          Redactions: {{ usageSummary.totalRedactions }}<br />
          Provider cost: ${{ (usageSummary.providerCostCents / 100).toFixed(2) }} |
          Billed (est): ${{ (usageSummary.billedCents / 100).toFixed(2) }}
        </p>
      </div>

      <div v-if="modelUsage.length" class="usage-box">
        <h3>Usage by model</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Requests</th>
              <th>Tokens</th>
              <th>Provider cost</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in modelUsage" :key="m.model_config_id || 'unknown'">
              <td>{{ m.model_config_id || 'unknown' }}</td>
              <td>{{ m.total_requests }}</td>
              <td>{{ Number(m.total_tokens || 0).toLocaleString() }}</td>
              <td>${{ (Number(m.provider_cost_cents || 0) / 100).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="actions-row">
        <div class="export-row">
          <label>Start <input type="datetime-local" v-model="exportStart" /></label>
          <label>End <input type="datetime-local" v-model="exportEnd" /></label>
          <label>
            Tenant
            <select v-model="exportTenant">
              <option value="">All</option>
              <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <button class="secondary" @click="exportUsage(account.id)" :disabled="exporting">
            {{ exporting ? 'Exporting…' : 'Export usage CSV' }}
          </button>
          <span v-if="exportError" class="error">{{ exportError }}</span>
        </div>
      </div>

      <h3>Tenants</h3>
      <p v-if="!tenants.length" class="muted">No tenants for this account yet.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Tenant ID</th>
            <th>Plan</th>
            <th>Credits remaining (¢)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tenants" :key="t.id">
            <td>{{ t.name }}</td>
            <td><code>{{ t.id }}</code></td>
            <td>{{ t.plan }}</td>
            <td>{{ findCredits(t.id) }}</td>
            <td>
              <button class="secondary" @click="rotateTenantKey(t.id)" :disabled="rotatingTenantId === t.id">
                {{ rotatingTenantId === t.id ? 'Rotating…' : 'Rotate key' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="accountsList.length" class="list">
      <h2>Recent accounts</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Plan/credits</th>
            <th>Tenants</th>
            <th>Last payment</th>
            <th>Last usage</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in accountsList" :key="a.id">
            <td>
              {{ a.email }}<br />
              <code>{{ a.id }}</code>
            </td>
            <td>
              <div>{{ formatCredits(a.credits) }}</div>
            </td>
            <td>{{ a.tenantCount }}</td>
            <td>{{ formatDate(a.lastPaymentAt) }}</td>
            <td>{{ formatDate(a.lastUsageAt) || '—' }}</td>
            <td>{{ formatDate(a.createdAt) }}</td>
            <td>
              <button class="danger" @click="deleteAccount(a.id)" :disabled="deletingId === a.id">
                {{ deletingId === a.id ? 'Deleting…' : 'Delete' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

const apiBase = import.meta.env.VITE_API_BASE_URL;

const email = ref('');
const loading = ref(false);
const error = ref('');
const account = ref(null);
const tenants = ref([]);
const balances = ref([]);
const accountsList = ref([]);
const loadingList = ref(false);

const createEmail = ref('');
const createPassword = ref('');
const createTenant = ref('');
const creating = ref(false);
const createResult = ref(null);
const deletingId = ref('');
const usageSummary = ref(null);
const resettingPw = ref(false);
const rotatingKey = ref(false);
const rotatedKey = ref('');
const modelUsage = ref([]);
const rotatingTenantId = ref('');
const exporting = ref(false);
const exportError = ref('');
const exportStart = ref('');
const exportEnd = ref('');
const exportTenant = ref('');

function findCredits(tenantId) {
  const b = balances.value.find(b => b.tenant_id === tenantId);
  if (!b) return 0;
  return b.credits_remaining ?? 0;
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString();
}

function formatCredits(n) {
  const num = Number(n || 0);
  return `${num.toLocaleString()} credits`;
}

async function fetchUsage(accountId) {
  usageSummary.value = null;
  modelUsage.value = [];
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      error.value = 'No admin token stored. Go back to /admin and log in.';
      return;
    }
    const res = await fetch(`${apiBase}/admin/accounts/${accountId}/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Usage fetch failed (${res.status})`);
    }
    usageSummary.value = data.usage || null;
    await fetchModelUsage(accountId, token);
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Usage fetch failed.';
  }
}

async function fetchModelUsage(accountId, token) {
  try {
    const res = await fetch(`${apiBase}/admin/accounts/${accountId}/usage/models`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Model usage fetch failed (${res.status})`);
    }
    modelUsage.value = data.models || [];
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Model usage fetch failed.';
  }
}

async function lookup() {
  error.value = '';
  account.value = null;
  tenants.value = [];
  balances.value = [];
  loading.value = true;
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      error.value = 'No admin token stored. Go back to /admin and log in.';
      loading.value = false;
      return;
    }
    const url = new URL(`${apiBase}/admin/accounts`);
    url.searchParams.set('email', email.value.trim().toLowerCase());
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Lookup failed (${res.status})`);
    }
    account.value = data.account || null;
    tenants.value = data.tenants || [];
    balances.value = data.balances || [];
    if (account.value?.id) {
      await fetchUsage(account.value.id);
    }
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Lookup failed.';
  } finally {
    loading.value = false;
  }
}

async function loadList() {
  error.value = '';
  accountsList.value = [];
  loadingList.value = true;
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      error.value = 'No admin token stored. Go back to /admin and log in.';
      loadingList.value = false;
      return;
    }
    const url = new URL(`${apiBase}/admin/accounts/list`);
    url.searchParams.set('limit', '50');
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `List failed (${res.status})`);
    }
    accountsList.value = data.accounts || [];
  } catch (e) {
    console.error(e);
    error.value = e.message || 'List failed.';
  } finally {
    loadingList.value = false;
  }
}

async function resetPassword(accountId) {
  const newPw = window.prompt('Enter new password for this account:');
  if (!newPw) return;
  resettingPw.value = true;
  error.value = '';
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      error.value = 'No admin token stored. Go back to /admin and log in.';
      resettingPw.value = false;
      return;
    }
    const res = await fetch(`${apiBase}/admin/accounts/${accountId}/password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Reset failed (${res.status})`);
    }
    alert('Password reset.');
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Reset failed.';
  } finally {
    resettingPw.value = false;
  }
}

async function rotateApiKey(accountId) {
  rotatingKey.value = true;
  rotatedKey.value = '';
  error.value = '';
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      error.value = 'No admin token stored. Go back to /admin and log in.';
      rotatingKey.value = false;
      return;
    }
    const res = await fetch(`${apiBase}/admin/accounts/${accountId}/api-key`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Rotate failed (${res.status})`);
    }
    rotatedKey.value = data.apiKey || '';
    alert(`New API key: ${rotatedKey.value}`);
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Rotate failed.';
  } finally {
    rotatingKey.value = false;
  }
}

async function rotateTenantKey(tenantId) {
  rotatingTenantId.value = tenantId;
  rotatedKey.value = '';
  error.value = '';
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      error.value = 'No admin token stored. Go back to /admin and log in.';
      rotatingTenantId.value = '';
      return;
    }
    const res = await fetch(`${apiBase}/admin/tenants/${tenantId}/api-key`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Rotate failed (${res.status})`);
    }
    rotatedKey.value = data.apiKey || '';
    alert(`New API key: ${rotatedKey.value}`);
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Rotate failed.';
  } finally {
    rotatingTenantId.value = '';
  }
}

async function exportUsage(accountId) {
  exporting.value = true;
  exportError.value = '';
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      exportError.value = 'No admin token stored. Go back to /admin and log in.';
      exporting.value = false;
      return;
    }
    const url = new URL(`${apiBase}/admin/accounts/${accountId}/usage/export`);
    if (exportStart.value) url.searchParams.set('start', exportStart.value);
    if (exportEnd.value) url.searchParams.set('end', exportEnd.value);
    if (exportTenant.value) url.searchParams.set('tenantId', exportTenant.value);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-${accountId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    exportError.value = e.message || 'Export failed.';
  } finally {
    exporting.value = false;
  }
}

async function createAccount() {
  error.value = '';
  createResult.value = null;
  creating.value = true;
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      error.value = 'No admin token stored. Go back to /admin and log in.';
      creating.value = false;
      return;
    }
    const res = await fetch(`${apiBase}/admin/accounts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: createEmail.value.trim().toLowerCase(),
        password: createPassword.value,
        tenantName: createTenant.value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Create failed (${res.status})`);
    }
    createResult.value = data;
    createEmail.value = '';
    createPassword.value = '';
    createTenant.value = '';
    await loadList();
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Create failed.';
  } finally {
    creating.value = false;
  }
}

async function deleteAccount(id) {
  if (!id) return;
  const confirmDelete = window.confirm('Delete this account? This cannot be undone.');
  if (!confirmDelete) return;
  error.value = '';
  deletingId.value = id;
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      error.value = 'No admin token stored. Go back to /admin and log in.';
      deletingId.value = '';
      return;
    }
    const res = await fetch(`${apiBase}/admin/accounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Delete failed (${res.status})`);
    }
    accountsList.value = accountsList.value.filter((a) => a.id !== id);
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Delete failed.';
  } finally {
    deletingId.value = '';
  }
}
</script>

<style scoped>
.admin-accounts {
  max-width: 900px;
  margin: 0 auto;
}

.lead {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.controls label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
}

.controls input[type='email'] {
  min-width: 260px;
}

.secondary-link {
  font-size: 0.85rem;
}

.error {
  color: #b91c1c;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.result h2 {
  margin-top: 0.75rem;
}

.result h3 {
  margin-top: 0.75rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.table th,
.table td {
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.5rem;
  text-align: left;
}

.muted {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.usage-box {
  margin-bottom: 0.75rem;
  padding: 0.6rem 0.75rem;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  background: #f9fafb;
}

.export-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-end;
}

.export-row label {
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
}

.create-card {
  margin-top: 1rem;
  padding: 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: #f9fafb;
}

.inline-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-end;
}

.inline-form label {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
}

.secondary {
  background: #fff;
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
}

.danger {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #7f1d1d;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
}

.list {
  margin-top: 1.5rem;
}
</style>
