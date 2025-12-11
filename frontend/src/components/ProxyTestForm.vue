<template>
  <section class="proxy-test">
    <h2>Try Quieter.ai</h2>
    <p class="lead">
      Send a prompt through Quieter.ai and see what gets removed before it reaches the model.
    </p>

    <div class="grid">
      <div class="panel">
        <h3>1. Your prompt</h3>
        <textarea
          v-model="prompt"
          rows="6"
          placeholder="E.g. My name is Sarah Taylor, my student ID is 123456, and my email is sarah@example.com. Help me write a message to my professor."
        />

        <label class="meta-label">
          Optional metadata (JSON)
          <textarea
            v-model="metadataInput"
            rows="4"
            placeholder='{"user":"sarah","email":"sarah@example.com"}'
          />
        </label>

        <button class="submit" :disabled="loading" @click="submit">
          {{ loading ? 'Sending…' : 'Send via Quieter.ai' }}
        </button>

        <p v-if="error" class="error">{{ error }}</p>
      </div>

      <div class="panel">
        <h3>2. What the model sees</h3>
        <p class="hint" v-if="!scrubbedPrompt">Submit a prompt to see the scrubbed version.</p>
        <pre v-else class="scrubbed">{{ scrubbedPrompt }}</pre>

        <h3 class="response-heading" v-if="modelResponse">3. Model response</h3>
        <pre v-if="modelResponse" class="response">{{ modelResponse }}</pre>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

const apiBase = import.meta.env.VITE_API_BASE_URL;

const prompt = ref('');
const metadataInput = ref('');
const scrubbedPrompt = ref('');
const modelResponse = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  scrubbedPrompt.value = '';
  modelResponse.value = '';

  if (!prompt.value.trim()) {
    error.value = 'Please enter a prompt.';
    return;
  }

  let metadata;
  if (metadataInput.value.trim()) {
    try {
      metadata = JSON.parse(metadataInput.value);
    } catch (e) {
      error.value = 'Metadata must be valid JSON.';
      return;
    }
  }

  loading.value = true;
  try {
    const res = await fetch(`${apiBase}/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.value, metadata }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Request failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    scrubbedPrompt.value = data.prompt ?? '';
    modelResponse.value = data.modelResponse ?? '';
  } catch (e) {
    console.error(e);
    error.value = e.message || 'Something went wrong calling the proxy.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.proxy-test {
  margin-top: 2.5rem;
}

.lead {
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 1.5rem;
}

.panel {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  padding: 1.5rem 1.4rem;
}

textarea {
  width: 100%;
  font-family: inherit;
  font-size: 0.95rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  padding: 0.6rem 0.7rem;
  resize: vertical;
  box-sizing: border-box;
}

.meta-label {
  display: block;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.submit {
  margin-top: 1rem;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #111827;
  font-weight: 600;
}

.submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  margin-top: 0.75rem;
  color: #b91c1c;
  font-size: 0.85rem;
}

.hint {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.scrubbed,
.response {
  margin-top: 0.75rem;
  background: #f9fafb;
  border-radius: 10px;
  padding: 0.75rem 0.8rem;
  font-size: 0.85rem;
  white-space: pre-wrap;
}

.response-heading {
  margin-top: 1.5rem;
}

@media (max-width: 840px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
