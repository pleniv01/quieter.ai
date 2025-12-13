<template>
  <section class="admin-models">
    <h1>Configured models</h1>
    <p class="lead">
      This is a barebones view of the models Quieter can route to. Editing is coming later; for now
      you can adjust pricing via the backend or SQL and refresh here.
    </p>

    <div class="actions">
      <RouterLink to="/admin">Change admin token</RouterLink>
      <RouterLink to="/admin/accounts">Accounts</RouterLink>
      <button type="button" @click="load" :disabled="loading">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <table v-if="models.length" class="models">
      <thead>
        <tr>
          <th>ID</th>
          <th>Provider</th>
          <th>Name</th>
          <th>Tier</th>
          <th>Input ¢/1k</th>
          <th>Output ¢/1k</th>
          <th>Enabled</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in models" :key="m.id">
          <td><code>{{ m.id }}</code></td>
          <td>{{ m.provider }}</td>
          <td>{{ m.display_name }}</td>
          <td>{{ m.tier }}</td>
          <td>{{ m.price_input_per_1k_cs }}</td>
          <td>{{ m.price_output_per_1k_cs }}</td>
          <td>{{ m.enabled ? 'yes' : 'no' }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!loading" class="empty">No models found yet. Check your migrations and seeds.</p>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const apiBase = import.meta.env.VITE_API_BASE_URL;
const models = ref([]);
const loading = ref(false);
const error = ref('');

async function load() {
  error.value = '';
  loading.value = true;
  try {
    const token = localStorage.getItem('quieterAdminToken') || '';
    if (!token) {
      error.value = 'No admin token stored. Go back and log in.';
      loading.value = false;
      return;
    }
    const res = await fetch(`${apiBase}/admin/models`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Failed to load models (${res.status})`);
    }
    models.value = data.models || [];
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Failed to load models.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.admin-models {
  max-width: 900px;
  margin: 0 auto;
}

.lead {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.error {
  color: #b91c1c;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.models {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.models th,
.models td {
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.5rem;
  text-align: left;
}

.empty {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
</style>
