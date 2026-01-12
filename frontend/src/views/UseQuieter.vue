<template>
  <section class="use">
    <h1>Use Quieter</h1>
    <p class="lead">
      Send a prompt through your Quieter API key. This runs directly through the Quieter proxy
      without requiring Claude.
    </p>
    <p v-if="loggedInEmail" class="account-note">
      Logged in as <strong>{{ loggedInEmail }}</strong>. Usage is tracked to the Quieter account
      tied to the API key you use.
    </p>

    <div class="card">
      <label>
        Quieter API key (qtr_...)
        <input v-model="apiKeyInput" type="password" autocomplete="off" />
      </label>
      <label class="inline">
        <input v-model="rememberKey" type="checkbox" />
        Remember this key in this browser
      </label>

      <div class="row">
        <label>
          Scrub mode
          <select v-model="scrubMode">
            <option value="strict">Strict</option>
            <option value="light">Light</option>
            <option value="off">Off</option>
          </select>
        </label>

        <label>
          Model family
          <select v-model="modelFamily">
            <option value="auto">Auto</option>
            <option value="haiku">Haiku</option>
            <option value="sonnet">Sonnet</option>
            <option value="opus">Opus</option>
          </select>
        </label>
      </div>

      <label class="inline">
        <input v-model="modelFallback" type="checkbox" />
        Try next model if the first choice is unavailable
      </label>

      <label>
        Prompt
        <textarea v-model="prompt" rows="8" placeholder="Write your prompt here..." />
      </label>

      <button type="button" :disabled="loading" @click="sendPrompt">
        {{ loading ? 'Sending…' : 'Send via Quieter' }}
      </button>

      <p v-if="modelUsed" class="meta">Model used: {{ modelUsed }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-if="response" class="response-card">
      <h2>Response</h2>
      <pre>{{ response }}</pre>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const apiBase = import.meta.env.VITE_API_BASE_URL;
const STORAGE_KEY = 'quieterWebApiKey';

const apiKeyInput = ref('');
const rememberKey = ref(false);
const scrubMode = ref('strict');
const modelFamily = ref('auto');
const modelFallback = ref(false);
const prompt = ref('');
const response = ref('');
const modelUsed = ref('');
const error = ref('');
const loading = ref(false);
const loggedInEmail = ref(localStorage.getItem('quieterEmail') || '');

onMounted(() => {
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    apiKeyInput.value = savedKey;
    rememberKey.value = true;
  }
});

watch(rememberKey, (value) => {
  if (!value) {
    localStorage.removeItem(STORAGE_KEY);
  } else if (apiKeyInput.value.trim()) {
    localStorage.setItem(STORAGE_KEY, apiKeyInput.value.trim());
  }
});

watch(apiKeyInput, (value) => {
  if (rememberKey.value) {
    localStorage.setItem(STORAGE_KEY, value.trim());
  }
});

async function sendPrompt() {
  error.value = '';
  response.value = '';
  modelUsed.value = '';

  const key = apiKeyInput.value.trim();
  if (!key) {
    error.value = 'Please paste your Quieter API key.';
    return;
  }
  if (!prompt.value.trim()) {
    error.value = 'Please enter a prompt.';
    return;
  }

  loading.value = true;
  try {
    const body = {
      prompt: prompt.value,
      scrub_mode: scrubMode.value,
    };
    if (modelFamily.value && modelFamily.value !== 'auto') {
      body.model_family = modelFamily.value;
    }
    if (modelFallback.value) {
      body.model_fallback = true;
    }

    const res = await fetch(`${apiBase}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    response.value = data.modelResponse || '';
    modelUsed.value = data.modelInfo?.displayName || data.model || '';
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Request failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.use {
  max-width: 760px;
  margin: 0 auto;
}

.lead {
  color: var(--color-text-muted);
  margin-bottom: 1.2rem;
}

.account-note {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-bottom: 1.2rem;
}

.card,
.response-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-soft);
  padding: 1.6rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.response-card {
  margin-top: 1.5rem;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.8rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.inline {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

input,
select,
textarea {
  font-family: inherit;
  font-size: 0.95rem;
  padding: 0.55rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

textarea {
  resize: vertical;
}

button {
  align-self: flex-start;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #111827;
  font-weight: 600;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  color: #b91c1c;
  font-size: 0.85rem;
}

.meta {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

pre {
  background: #f9fafb;
  border-radius: 10px;
  padding: 0.9rem;
  white-space: pre-wrap;
  font-size: 0.9rem;
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
