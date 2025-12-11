<template>
  <section class="hero">
    <div class="hero-card">
      <h1>Quieter.ai</h1>
      <p class="subtitle">
        A privacy shield between your apps and GPT providers — they only ever see Quieter.ai,
        never your users.
      </p>
      <div class="badge-row">
        <span class="badge">Identity shield · Multi-tenant proxy · SDK-ready</span>
      </div>
      <p class="note">
        Your users talk to your app. Your app talks to Quieter.ai. Quieter.ai talks to the
        model. The model never knows who your users are.
      </p>
    </div>
  </section>

  <section class="who">
    <h2>Who Quieter.ai is for</h2>
    <ul>
      <li>Wellness, journaling, and mental-health apps that promise true privacy</li>
      <li>Education & student tools where identity and text must stay off provider logs</li>
      <li>Enterprise internal tools that cannot expose employee conversations upstream</li>
      <li>Consumer productivity and note-taking apps handling personal narratives</li>
      <li>Agencies and studios building GPT apps for privacy-conscious clients</li>
    </ul>
    <p class="note">
      Learn how the shield works on the <RouterLink to="/privacy">Privacy</RouterLink> page.
    </p>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.hero {
  display: flex;
  justify-content: center;
}

.hero-card {
  background: #ffffff;
  border-radius: var(--color-radius-lg, 18px);
  box-shadow: var(--shadow-soft);
  padding: 2.75rem 2.5rem;
  border: 1px solid rgba(0, 0, 0, 0.03);
  max-width: 720px;
  border-top: 4px solid var(--color-primary);
}

h1 {
  font-size: 2.4rem;
  margin-bottom: 0.75rem;
}

.subtitle {
  font-size: 1.05rem;
  color: var(--color-text-muted);
  margin-bottom: 1.25rem;
}

.badge-row {
  margin-bottom: 1.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: #7c2d12;
  font-size: 0.8rem;
  font-weight: 600;
}

.note {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.who {
  margin-top: 2.5rem;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}

.who ul {
  margin: 0.75rem 0 1rem;
  padding-left: 1.2rem;
  color: var(--color-text-muted);
}

.who li + li {
  margin-top: 0.35rem;
}
</style>
