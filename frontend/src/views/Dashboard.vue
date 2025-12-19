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
      <div v-if="billingStatus" class="notice">
        <p v-if="billingStatus === 'success'">Billing update received. Refreshing your balance…</p>
        <p v-else-if="billingStatus === 'cancel'">Billing was canceled.</p>
      </div>

      <p class="dev-link">
        For implementation details, see the
        <RouterLink to="/docs/how-to-use-quieter-api-key">API key guide</RouterLink>.
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

      <div v-if="usage && usage.totalRequests === 0" class="getting-started">
        <h2>Getting started with your Quieter shield</h2>
        <p>
          You’ve created an account, but haven’t sent any traffic through Quieter.ai yet. To start
          seeing "conversations shielded" here, you can:
        </p>
        <ul>
          <li>
            Use the browser extension’s test prompt (paste your <code>qtr_...</code> key in the
            popup and send a sample question).
          </li>
          <li>
            Or run a quick <code>curl</code> call:
            <code>
              curl -X POST https://quieteraiapp-production.up.railway.app/query \
                -H "Authorization: Bearer {{QUIETER_API_KEY}}" \
                -H "Content-Type: application/json" \
                -d '{"prompt":"Say hello from Quieter.ai","metadata":{"source":"dashboard-getting-started"}}'
            </code>
          </li>
        </ul>
        <p class="getting-started-note">
          After you send a few test requests, refresh this page to see your protected usage numbers
          update.
        </p>
      </div>

      <div v-if="usage" class="billing-card">
        <h2>Billing & plan</h2>
        <p>
          <strong>Plan:</strong>
          <span v-if="usage.plan">{{ usage.plan }}</span>
          <span v-else>dev</span>
          <br />
          <strong>Credits remaining:</strong>
          <span>${{ (usage.creditsRemainingCents / 100).toFixed(2) }}</span>
        </p>
        <p v-if="lastPayment" class="billing-note">
          <strong>Last payment:</strong>
          ${{ (lastPayment.amountCents / 100).toFixed(2) }}
          <span v-if="lastPayment.paidAt">
            on {{ new Date(lastPayment.paidAt).toLocaleString() }}
          </span>
        </p>
        <p v-else class="billing-note">
          <strong>Last payment:</strong> none recorded yet.
        </p>
        <p class="billing-note">
          Base plan: ${{ (subscriptionPriceCents / 100).toFixed(2) }}/mo includes
          {{ subscriptionCredits }} credits. Top-ups: ${{ (topupPriceCents / 100).toFixed(2) }} for
          {{ topupCredits }} credits.
        </p>
        <div class="billing-actions">
          <button
            type="button"
            class="secondary"
            @click="startSubscription"
            :disabled="startingSubscription"
          >
            {{ startingSubscription ? 'Redirecting…' : `Subscribe ($${(subscriptionPriceCents / 100).toFixed(2)}/mo)` }}
          </button>
          <button type="button" class="ghost" @click="startTopup" :disabled="startingTopup">
            {{ startingTopup ? 'Redirecting…' : `Top up ${topupCredits} credits ($${(topupPriceCents / 100).toFixed(2)})` }}
          </button>
        </div>
      </div>

      <div v-if="report" class="report-card">
        <h2>Usage report (current)</h2>
        <p>
          <strong>Conversations shielded:</strong> {{ report.totalRequests }}<br />
          <strong>Approx. private tokens:</strong> {{ report.totalTokens }}<br />
          <strong>Redactions applied:</strong> {{ report.totalRedactions }}<br />
          <strong>Estimated provider cost:</strong>
          ${{ (report.providerCostCents / 100).toFixed(2) }}<br />
          <strong>Your billed amount:</strong>
          ${{ (report.billedCents / 100).toFixed(2) }}
        </p>
      </div>

      <button type="button" @click="loadUsage" :disabled="loading">
        {{ loading ? 'Loading usage…' : 'Refresh usage' }}
      </button>

      <button type="button" class="secondary" @click="loadReport" :disabled="loadingReport">
        {{ loadingReport ? 'Loading report…' : 'Refresh usage report' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="reportError" class="error">{{ reportError }}</p>

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
        <div>
          <dt>Estimated provider cost</dt>
          <dd>
            <span v-if="usage.providerCostCents !== undefined">
              ${{ (usage.providerCostCents / 100).toFixed(2) }}
            </span>
            <span v-else>—</span>
          </dd>
        </div>
        <div>
          <dt>Your billed amount</dt>
          <dd>
            <span v-if="usage.billedCents !== undefined">
              ${{ (usage.billedCents / 100).toFixed(2) }}
            </span>
            <span v-else>—</span>
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';

const apiBase = import.meta.env.VITE_API_BASE_URL;

const accountId = ref(localStorage.getItem('quieterAccountId') || '');
const email = ref(localStorage.getItem('quieterEmail') || '');
const usage = ref(null);
const loading = ref(false);
const error = ref('');
const profileName = ref('');
const tenantCount = ref(0);

const report = ref(null);
const loadingReport = ref(false);
const reportError = ref('');

// Pricing (edit here to adjust displayed copy; backend uses env vars)
const subscriptionPriceCents = 995;
const subscriptionCredits = 500;
const topupPriceCents = 995;
const topupCredits = 1000;

const startingSubscription = ref(false);
const startingTopup = ref(false);

const lastPayment = ref(null);
const loadingBilling = ref(false);

const billingStatus = ref(new URLSearchParams(window.location.search).get('billing') || '');

async function fetchMe() {
  if (!accountId.value) return false;
  try {
    const url = new URL(`${apiBase}/me`);
    url.searchParams.set('accountId', accountId.value);
    const res = await fetch(url.toString());
    if (!res.ok) {
      // If the account is not found, clear local state so the user is sent back to login.
      if (res.status === 404) {
        localStorage.removeItem('quieterAccountId');
        localStorage.removeItem('quieterEmail');
        accountId.value = '';
        email.value = '';
      }
      return false;
    }
    const data = await res.json();
    email.value = data.email || email.value;
    profileName.value = data.primaryTenantName || '';
    tenantCount.value = data.tenantCount || 0;
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

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

async function loadBilling() {
  if (!accountId.value) return;
  loadingBilling.value = true;
  try {
    const url = new URL(`${apiBase}/me/billing`);
    url.searchParams.set('accountId', accountId.value);
    const res = await fetch(url.toString());
    if (!res.ok) {
      lastPayment.value = null;
      return;
    }
    const data = await res.json().catch(() => ({}));
    lastPayment.value = data.lastPayment || null;
  } catch (e) {
    console.error(e);
    lastPayment.value = null;
  } finally {
    loadingBilling.value = false;
  }
}

async function startCheckout() {
  // Deprecated single-flow handler (kept for safety)
  await startSubscription();
}

async function startSubscription() {
  if (!accountId.value) return;
  startingSubscription.value = true;
  try {
    const res = await fetch(`${apiBase}/billing/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: accountId.value, kind: 'subscription' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.url) {
      console.error('Failed to create checkout session', data);
      startingSubscription.value = false;
      return;
    }
    window.location.href = data.url;
  } catch (e) {
    console.error(e);
  } finally {
    // We intentionally do not reset startingSubscription here in the happy path because we expect a redirect.
    // If the call fails, it is reset above.
  }
}

async function startTopup() {
  if (!accountId.value) return;
  startingTopup.value = true;
  try {
    const res = await fetch(`${apiBase}/billing/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: accountId.value, kind: 'topup' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.url) {
      console.error('Failed to create top-up session', data);
      startingTopup.value = false;
      return;
    }
    window.location.href = data.url;
  } catch (e) {
    console.error(e);
  } finally {
    // We intentionally do not reset startingTopup here in the happy path because we expect a redirect.
    // If the call fails, it is reset above.
  }
}

async function loadReport() {
  if (!accountId.value) return;
  reportError.value = '';
  loadingReport.value = true;
  try {
    const url = new URL(`${apiBase}/me/report`);
    url.searchParams.set('accountId', accountId.value);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to load report (${res.status})`);
    }
    const data = await res.json();
    report.value = data.report || null;
  } catch (e) {
    console.error(e);
    reportError.value = e.message || 'Failed to load report.';
  } finally {
    loadingReport.value = false;
  }
}

onMounted(async () => {
  if (!accountId.value) return;
  const ok = await fetchMe();
  if (!ok) {
    // If we can't validate the stored account, send user to login.
    window.location.href = '/login';
    return;
  }
  await loadUsage();
  await loadBilling();

  // Stripe subscription invoice processing may land slightly after the redirect.
  if (billingStatus.value === 'success') {
    setTimeout(async () => {
      await loadUsage();
      await loadBilling();
    }, 1500);
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

.getting-started {
  margin-bottom: 1.1rem;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  border: 1px dashed var(--color-border);
  background: #fefce8;
  font-size: 0.9rem;
}

.getting-started h2 {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.getting-started ul {
  margin: 0.4rem 0 0.6rem;
  padding-left: 1.2rem;
}

.getting-started code {
  font-size: 0.8rem;
}

.getting-started-note {
  margin-top: 0.35rem;
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

.billing-note {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0.4rem 0 0.8rem;
}

.billing-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
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
