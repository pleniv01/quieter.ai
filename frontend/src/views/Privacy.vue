<template>
  <section class="privacy">
    <header class="privacy-header">
      <span class="eyebrow">Privacy at the core</span>
      <h1>How Quieter.ai Protects You</h1>
      <p class="subtitle">
        (And why a normal proxy isn’t enough)
      </p>
    </header>

    <p>
      When you use GPT-style models today, they see more than just your text. They see your
      network, your keys, and the shape of your traffic. A normal proxy can hide your IP
      address — but it can’t hide <em>who</em> is really behind the request.
    </p>

    <p>
      <strong>Quieter.ai was built to fix that.</strong>
    </p>

    <section class="panel panel-highlight">
      <h2>More than a proxy. A true identity shield.</h2>
      <p>
        With Quieter.ai in the middle, GPT providers only ever see Quieter.ai’s IPs and API
        keys, not your users or your infrastructure.
      </p>
      <p>
        Your app → Quieter.ai → GPT provider. The model never sees your tenant’s network,
        cookies, or accounts.
      </p>
    </section>

    <section class="panel">
      <h2>Try Quieter.ai with a quick demo</h2>
      <p class="clarify">
        Type something below and we’ll send it through Quieter.ai’s demo proxy. For this demo,
        we don’t use your account or API key — it’s just a quick way to see the shield in action.
      </p>

      <form class="demo" @submit.prevent="runDemo">
        <label>
          Prompt
          <textarea v-model="demoPrompt" rows="3"></textarea>
        </label>

        <button type="submit" :disabled="demoLoading">
          {{ demoLoading ? 'Talking to Quieter…' : 'Ask via Quieter demo' }}
        </button>

        <p v-if="demoError" class="demo-error">{{ demoError }}</p>

        <div v-if="demoResponse" class="demo-result">
          <h3>Model reply (via Quieter)</h3>
          <p>{{ demoResponse }}</p>

          <details class="demo-details" v-if="demoDirectView && demoQuieterView" open>
            <summary>Hide header details</summary>
            <div class="demo-views">
              <div>
                <h4>If you sent this directly to a GPT site…</h4>
                <pre v-html="formatViewHtml(demoDirectView)"></pre>
              </div>
              <div>
                <h4>What Quieter actually forwards…</h4>
                <pre v-html="formatViewHtml(demoQuieterView, true)"></pre>
              </div>
            </div>

            <div class="demo-explain">
              <div>
                <h4>Why the "direct" view is personally linkable</h4>
                <p>
                  If you send this directly to a GPT provider, they get <em>all</em> of the above on every
                  call, plus whatever cookies or auth headers their JavaScript has set and any per-user
                  identifiers embedded in URLs or request bodies.
                </p>
                <p class="demo-quote">
                  “The browser with UA = X, on IP = Y, at hours Z, sending these topics, is the same user,”
                  and they can correlate that with any future login or purchase.
                </p>
                <ul>
                  <li>
                    <strong>IP and forwarding headers</strong> (for example, <code>x-forwarded-for</code>,
                    <code>x-real-ip</code>) tie activity to your network/ISP and make it easy to follow one
                    person or household over time.
                  </li>
                  <li>
                    <strong>Browser fingerprint headers</strong> like <code>user-agent</code>,
                    <code>sec-ch-ua</code>, <code>sec-ch-ua-platform</code>, and
                    <code>accept-language</code> describe your exact browser, OS, and language — together they
                    form a stable fingerprint that can be recognized across sessions.
                  </li>
                  <li>
                    <strong>Context headers</strong> such as <code>referer</code> and <code>origin</code>
                    say where you were browsing when you sent the prompt, which helps a provider build a
                    profile of your habits over time.
                  </li>
                  <li>
                    The “personal” part isn’t your name in a header, it’s
                    <strong>linkability</strong> (tying many prompts back to the same origin) and
                    <strong>context leakage</strong> (which site, which browser, which OS, which region,
                    which habits).
                  </li>
                </ul>
              </div>

              <div>
                <h4>What Quieter changes in the "via Quieter" view</h4>
                <p>
                  With Quieter in the middle, the provider sees Quieter’s network and client instead of yours,
                  plus only the scrubbed JSON body we construct. We terminate per-user network signals on our
                  side and originate a clean, account-level connection to the model.
                </p>
                <ul>
                  <li>
                    The provider sees <strong>Quieter.ai's IPs and client fingerprint</strong>, not your
                    browser's IP / user-agent / device hints.
                  </li>
                  <li>
                    Only a <strong>minimal JSON body</strong> with the (optionally scrubbed) prompt is
                    forwarded — no browser cookies, no site-specific auth tokens, no referrer from your
                    personal browsing.
                  </li>
                  <li>
                    Over time, the provider can build a profile of "a Quieter.ai tenant" but not easily tie
                    those prompts back to your individual network, device, or login.
                  </li>
                  <li>
                    Your browser’s fingerprint and IP stay between you and Quieter — they don’t become part of
                    the model provider’s training or logging corpus.
                  </li>
                </ul>
              </div>
            </div>
          </details>
        </div>
      </form>
    </section>

    <section class="panel">
      <h2>What Quieter.ai removes or replaces</h2>

      <p class="clarify">
        The core of Quieter.ai is network identity shielding: GPT providers see Quieter.ai’s
        IPs and keys, not yours. On top of that, you can optionally enable extra content
        scrubbing, which further reduces what leaks into model logs.
      </p>

      <article class="item">
        <h3>1. Personal Identifiers (optional scrub layer)</h3>
        <p>
          Proxies pass through whatever your app sends. When Quieter’s scrub layer is turned
          on, it can strip names, emails, usernames, account references, session IDs, and
          similar metadata before anything reaches the AI model.
        </p>
      </article>

      <article class="item">
        <h3>2. Tracking Noise</h3>
        <p>Modern apps leak identity everywhere:</p>
        <ul>
          <li>Referer headers</li>
          <li>Fingerprinting hints</li>
          <li>Device information</li>
          <li>Cookies</li>
          <li>Authentication tokens</li>
        </ul>
        <p>
          A proxy often forwards these.
          <strong>Quieter.ai deletes them.</strong>
        </p>
      </article>

      <article class="item">
        <h3>3. Unintended identity in your content (optional scrub layer)</h3>
        <p>If your app or browser accidentally includes:</p>
        <ul>
          <li>“User: Sarah T.”</li>
          <li>“My student ID is…”</li>
          <li>“Here’s my private note attached to the prompt…”</li>
        </ul>
        <p>
          A proxy will forward it upstream unchanged. With Quieter’s scrub layer enabled,
          those patterns can be intercepted, anonymized, or blocked <em>in addition to</em>
          the identity shield you get by default.
        </p>
      </article>
    </section>
  </section>
</template>

<script setup>
import { ref } from 'vue';

const apiBase = import.meta.env.VITE_API_BASE_URL;

const demoPrompt = ref('');
const demoResponse = ref('');
const demoError = ref('');
const demoLoading = ref(false);
const demoDirectView = ref(null);
const demoQuieterView = ref(null);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatViewHtml(view, isQuieter = false) {
  if (!view) return '';
  const lines = [];

  if (view.ip) {
    const ipLabel = '<span class="hdr-label hdr-ip">IP:</span>';
    const ipVal = `<span class="hdr-value">${escapeHtml(view.ip)}</span>`;
    lines.push(`${ipLabel} ${ipVal}`);
  }

  if (view.headers && view.headers.length) {
    lines.push('<span class="hdr-section">Headers:</span>');
    for (const h of view.headers) {
      const [rawName, ...rest] = String(h).split(':');
      const name = (rawName || '').trim();
      const value = (rest.join(':') || '').trim();
      const lower = name.toLowerCase();
      let cls = 'hdr-other';
      if (['x-forwarded-for', 'x-real-ip'].includes(lower)) cls = 'hdr-ip';
      else if (['user-agent', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'accept-language', 'dnt'].includes(lower)) cls = 'hdr-fp';
      else if (['referer', 'origin'].includes(lower)) cls = 'hdr-context';
      const nameHtml = `<span class="hdr-label ${cls}">${escapeHtml(name)}:</span>`;
      const valueHtml = `<span class="hdr-value">${escapeHtml(value)}</span>`;
      lines.push(`  ${nameHtml} ${valueHtml}`);
    }
  }

  if (view.body != null) {
    lines.push('<span class="hdr-section">Body:</span>');
    const bodyStr = typeof view.body === 'string' ? view.body : JSON.stringify(view.body, null, 2);
    const escapedBody = escapeHtml(bodyStr).replace(/\n/g, '\n');
    lines.push(escapedBody);
  }

  return lines.join('\n');
}

async function runDemo() {
  demoError.value = '';
  demoResponse.value = '';
  demoDirectView.value = null;
  demoQuieterView.value = null;
  const prompt = demoPrompt.value.trim();
  if (!prompt) {
    demoError.value = 'Please enter something to send.';
    return;
  }

  demoLoading.value = true;
  try {
    const res = await fetch(`${apiBase}/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, metadata: { source: 'privacy-demo' } }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      demoError.value = data.error || `Demo failed (${res.status})`;
      return;
    }

    demoResponse.value = data.modelResponse || '(No text response returned.)';
    demoDirectView.value = data.demoDirectView || null;
    demoQuieterView.value = data.demoQuieterView || null;
  } catch (e) {
    console.error(e);
    demoError.value = 'Could not reach the Quieter.ai demo right now.';
  } finally {
    demoLoading.value = false;
  }
}
</script>

<style scoped>
.privacy {
  max-width: 720px;
  margin: 0 auto;
}

.clarify {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.privacy-header {
  margin-bottom: 1.75rem;
}

.eyebrow {
  display: inline-flex;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--color-primary-soft);
  color: #7c2d12;
  font-weight: 600;
}

h1 {
  margin: 0.75rem 0 0.25rem;
  font-size: 2rem;
}

.subtitle {
  margin: 0;
  color: var(--color-text-muted);
}

.panel {
  margin-top: 1.75rem;
  padding: 1.5rem 1.4rem;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: #ffffff;
}

.demo {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.demo textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.6rem;
  font-size: 0.9rem;
}

.demo button {
  align-self: flex-start;
  border-radius: 999px;
  padding: 0.4rem 1.1rem;
  border: none;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #111827;
  font-weight: 600;
  cursor: pointer;
}

.demo button:disabled {
  opacity: 0.7;
  cursor: default;
}

.demo-error {
  color: #b91c1c;
  font-size: 0.85rem;
}

.demo-result {
  margin-top: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  background: #f9fafb;
  font-size: 0.9rem;
}

.demo-result h3 {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
}

.demo-details {
  margin-top: 0.75rem;
}

.demo-views {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.demo-views pre {
  margin: 0;
  padding: 0.6rem 0.7rem;
  background: #0f172a;
  color: #e5e7eb;
  border-radius: 6px;
  font-size: 0.8rem;
  overflow-x: auto;
  white-space: pre-wrap;
}

.hdr-label {
  font-weight: 600;
}

.hdr-section {
  color: #9ca3af;
  font-weight: 600;
}

.hdr-ip {
  color: #f97316; /* orange / network identity */
}

.hdr-fp {
  color: #38bdf8; /* fingerprinting headers */
}

.hdr-context {
  color: #a855f7; /* context / referrer */
}

.hdr-other {
  color: #9ca3af;
}

.hdr-value {
  color: #e5e7eb;
}

.demo-views h4 {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
}

.demo-explain {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 0.75rem;
  font-size: 0.85rem;
}

.demo-explain ul {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
  color: var(--color-text-muted);
}

.demo-explain h4 {
  margin: 0;
  font-size: 0.9rem;
}

.demo-quote {
  margin: 0.4rem 0;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--color-text-muted);
}

.panel-highlight {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(255, 194, 14, 0.08), rgba(255, 138, 0, 0.03));
}

.item + .item {
  margin-top: 1.25rem;
}

ul {
  margin: 0.5rem 0 0.75rem;
  padding-left: 1.2rem;
}
</style>
