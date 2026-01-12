import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import { initTelemetry, recordTelemetryRequest, getTelemetryDebugSnapshot } from './telemetry.js';

dotenv.config();

const { Pool } = pkg;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const stripeSecret = process.env.STRIPE_SECRET_KEY || null;
const stripeSubPriceId =
  process.env.STRIPE_SUB_PRICE_ID || process.env.STRIPE_PRICE_ID || null; // backward compatible
const stripeTopupPriceId = process.env.STRIPE_TOPUP_PRICE_ID || null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const stripeCheckoutMode = process.env.STRIPE_CHECKOUT_MODE || 'subscription'; // default for main CTA

// Credit grants (editable without code changes)
const subscriptionCredits = Number(process.env.SUBSCRIPTION_CREDITS || 500);
const topupCredits = Number(process.env.TOPUP_CREDITS || 1000);

const billingSuccessUrl =
  process.env.BILLING_SUCCESS_URL || 'https://quieter.ai/dashboard?billing=success';
const billingCancelUrl =
  process.env.BILLING_CANCEL_URL || 'https://quieter.ai/dashboard?billing=cancel';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
const adminEmails = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

// Simple mail transport; if SMTP_URL is not set we just log instead of sending.
let mailTransport = null;
if (process.env.SMTP_URL) {
  mailTransport = nodemailer.createTransport(process.env.SMTP_URL);
}

const app = express();
const port = process.env.PORT || 8000;

// Initialize anonymous, instance-level telemetry if explicitly enabled.
initTelemetry();

const hashApiKey = (key) =>
  crypto.createHash('sha256').update(key).digest('hex');

// Small helper: count how many times a pattern would be replaced in a string.
function countMatches(str, regex) {
  if (!str) return 0;
  let count = 0;
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  str.replace(re, () => {
    count += 1;
    return '';
  });
  return count;
}

// Helper to create an account + tenant + API key.
async function createAccountWithDefaults({ email, password, tenantName }) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await pool.query('SELECT id FROM accounts WHERE email = $1 LIMIT 1', [
    normalizedEmail,
  ]);
  if (existing.rows.length) {
    const err = new Error('Account already exists');
    err.status = 409;
    throw err;
  }

  const accountId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query('INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, $3)', [
    accountId,
    normalizedEmail,
    passwordHash,
  ]);

  const tenantId = crypto.randomUUID();
  const rawApiKey = 'qtr_' + crypto.randomBytes(24).toString('base64url');
  const apiKeyHash = hashApiKey(rawApiKey);
  const name = tenantName || 'Default Tenant';

  await pool.query(
    'INSERT INTO tenants (id, account_id, name, api_key_hash, plan) VALUES ($1, $2, $3, $4, $5)',
    [tenantId, accountId, name, apiKeyHash, 'dev']
  );

  const balanceId = crypto.randomUUID();
  await pool.query(
    'INSERT INTO balances (id, tenant_id, credits_remaining, billing_email, plan) VALUES ($1, $2, $3, $4, $5)',
    [balanceId, tenantId, 0, normalizedEmail, 'dev']
  );

  return { accountId, tenantId, apiKey: rawApiKey, normalizedEmail };
}

// Railway Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

// For now, allow all origins so the Netlify frontend can talk to this API.
// You can tighten this later to a specific origin.
app.use(cors({ origin: true }));

// Explicitly handle preflight for the /proxy endpoint so browsers see CORS headers.
app.options('/proxy', cors({ origin: true }));

// We attach the webhook route with raw body parsing before the global JSON parser.
// This allows Stripe to verify the signature against the unmodified payload.
app.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe || !stripeWebhookSecret) {
      return res.status(503).json({ ok: false, error: 'Billing webhook is not configured' });
    }
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ ok: false, error: 'Missing Stripe signature' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err) {
      console.error('Stripe webhook signature verification failed', err?.message || err);
      return res.status(400).json({ ok: false, error: 'Invalid signature' });
    }

    // Credit top-ups:
    // - one-time purchases: handled via checkout.session.completed (mode=payment/top-up)
    // - subscriptions: handled via invoice.paid (avoid double-crediting by ignoring checkout completion for subscriptions)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Only credit balances for one-time payments (top-ups).
      if (session.mode && session.mode !== 'payment') {
        return res.json({ ok: true });
      }

      const creditGrant =
        Number(session.metadata?.credits || session.metadata?.credit_amount) || topupCredits || 0;

      const email = session.customer_email || session.customer_details?.email || null;
      let accountId = session.metadata?.accountId || session.client_reference_id || null;

      try {
        if (!accountId && email) {
          const accountRes = await pool.query('SELECT id FROM accounts WHERE email = $1 LIMIT 1', [
            String(email).toLowerCase(),
          ]);
          accountId = accountRes.rows[0]?.id || null;
        }

        if (!accountId) {
          return res.json({ ok: true });
        }

        // Idempotency: record the Stripe event first; only credit if we inserted a new row.
        const paymentId = crypto.randomUUID();
        const insertRes = await pool.query(
          `INSERT INTO stripe_payments
            (id, account_id, stripe_event_id, stripe_object_id, kind, amount_cents, currency, stripe_created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8 > 0 THEN to_timestamp($8) ELSE NULL END)
           ON CONFLICT (stripe_event_id) DO NOTHING
           RETURNING id`,
          [
            paymentId,
            accountId,
            event.id,
            session.id || null,
            event.type,
            Number(session.amount_total ?? 0),
            session.currency || 'usd',
            Number(event.created || 0),
          ]
        );

        if (!insertRes.rows.length) {
          return res.json({ ok: true });
        }

        const tenantsRes = await pool.query('SELECT id FROM tenants WHERE account_id = $1', [
          accountId,
        ]);
        const tenantIds = tenantsRes.rows.map((r) => r.id);
        if (tenantIds.length) {
          await pool.query(
            'UPDATE balances SET credits_remaining = COALESCE(credits_remaining,0) + $1, plan = $2, updated_at = NOW() WHERE tenant_id = ANY($3::text[])',
            [creditGrant, 'quieter-hosted', tenantIds]
          );
        }
      } catch (e) {
        console.error('Failed to apply credits from Stripe webhook', e);
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const amountCents = Number(invoice.amount_paid ?? 0);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return res.json({ ok: true });
      }

      const creditGrant = subscriptionCredits || 0;

      // Ensure this invoice corresponds to the subscription price we expect (avoid crediting unrelated items).
      const priceIds = (invoice.lines?.data || []).map((l) => l.price?.id).filter(Boolean);
      if (stripeSubPriceId && priceIds.length && !priceIds.includes(stripeSubPriceId)) {
        return res.json({ ok: true });
      }

      try {
        let accountId = null;

        const stripeCustomerId = invoice.customer ? String(invoice.customer) : null;
        if (stripeCustomerId) {
          const accountRes = await pool.query(
            'SELECT id FROM accounts WHERE stripe_customer_id = $1 LIMIT 1',
            [stripeCustomerId]
          );
          accountId = accountRes.rows[0]?.id || null;
        }

        if (!accountId && invoice.customer_email) {
          const accountRes = await pool.query('SELECT id FROM accounts WHERE email = $1 LIMIT 1', [
            String(invoice.customer_email).toLowerCase(),
          ]);
          accountId = accountRes.rows[0]?.id || null;
        }

        if (!accountId) {
          return res.json({ ok: true });
        }

        const paymentId = crypto.randomUUID();
        const insertRes = await pool.query(
          `INSERT INTO stripe_payments
            (id, account_id, stripe_event_id, stripe_object_id, kind, amount_cents, currency, stripe_created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8 > 0 THEN to_timestamp($8) ELSE NULL END)
           ON CONFLICT (stripe_event_id) DO NOTHING
           RETURNING id`,
          [
            paymentId,
            accountId,
            event.id,
            invoice.id || null,
            event.type,
            amountCents,
            invoice.currency || 'usd',
            Number(event.created || 0),
          ]
        );

        if (!insertRes.rows.length) {
          return res.json({ ok: true });
        }

        const tenantsRes = await pool.query('SELECT id FROM tenants WHERE account_id = $1', [
          accountId,
        ]);
        const tenantIds = tenantsRes.rows.map((r) => r.id);
        if (tenantIds.length) {
          await pool.query(
            'UPDATE balances SET credits_remaining = COALESCE(credits_remaining,0) + $1, plan = $2, updated_at = NOW() WHERE tenant_id = ANY($3::text[])',
            [creditGrant, 'quieter-hosted', tenantIds]
          );
        }
      } catch (e) {
        console.error('Failed to apply credits from invoice.paid', e);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Billing webhook error', err);
    res.status(500).json({ ok: false, error: 'Webhook handler error' });
  }
});

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: dbRes.rows[0] });
  } catch (err) {
    console.error('Health check failed', err);
    res.status(500).json({ status: 'error', message: 'DB connection failed' });
  }
});

// --- Billing (Stripe test integration) ---
// Checkout session for subscription (default) or top-up.
app.post('/billing/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ ok: false, error: 'Billing is not configured' });
    }

    const { accountId, kind } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'accountId is required' });
    }

    const normalizedKind = kind === 'topup' ? 'topup' : 'subscription';
    const priceId =
      normalizedKind === 'topup'
        ? stripeTopupPriceId
        : stripeSubPriceId || stripeTopupPriceId || null;

    if (!priceId) {
      return res.status(503).json({ ok: false, error: 'Billing is not configured' });
    }

    // Look up the account email for nicer Stripe receipts and/or customer creation.
    const result = await pool.query(
      'SELECT email, stripe_customer_id FROM accounts WHERE id = $1 LIMIT 1',
      [accountId]
    );
    const email = result.rows[0]?.email || undefined;
    let stripeCustomerId = result.rows[0]?.stripe_customer_id || null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { accountId },
      });
      stripeCustomerId = customer.id;
      await pool.query('UPDATE accounts SET stripe_customer_id = $1 WHERE id = $2', [
        stripeCustomerId,
        accountId,
      ]);
    }

    const mode =
      normalizedKind === 'topup'
        ? 'payment'
        : stripeCheckoutMode === 'payment'
          ? 'payment'
          : 'subscription';

    const credits =
      normalizedKind === 'topup'
        ? topupCredits
        : subscriptionCredits || (stripeCheckoutMode === 'payment' ? topupCredits : subscriptionCredits);

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: accountId,
      metadata: { accountId, kind: normalizedKind, credits: credits || undefined },
      customer: stripeCustomerId,
      ...(mode === 'subscription'
        ? { subscription_data: { metadata: { accountId, kind: normalizedKind, credits } } }
        : {}),
      success_url: billingSuccessUrl,
      cancel_url: billingCancelUrl,
    });

    return res.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('Create checkout session error', err);
    return res.status(500).json({ ok: false, error: 'Could not create checkout session' });
  }
});

// Auth: signup creates account + tenant + initial balance + API key
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, tenantName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required' });
    }

    const { accountId, tenantId, apiKey, normalizedEmail } = await createAccountWithDefaults({
      email,
      password,
      tenantName,
    });

    return res.status(201).json({
      ok: true,
      accountId,
      tenantId,
      apiKey,
      email: normalizedEmail,
    });
  } catch (err) {
    console.error('Signup error', err);
    const status = err.status || 500;
    return res.status(status).json({ ok: false, error: err.message || 'Signup failed' });
  }
});

// Auth + subscribe in one step: create account then start subscription checkout.
app.post('/auth/signup-and-subscribe', async (req, res) => {
  try {
    if (!stripe || !stripeSubPriceId) {
      return res.status(503).json({ ok: false, error: 'Billing is not configured' });
    }

    const { email, password, tenantName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required' });
    }

    const { accountId, tenantId, apiKey, normalizedEmail } = await createAccountWithDefaults({
      email,
      password,
      tenantName,
    });

    const customer = await stripe.customers.create({
      email: normalizedEmail,
      metadata: { accountId },
    });
    const stripeCustomerId = customer.id;
    await pool.query('UPDATE accounts SET stripe_customer_id = $1 WHERE id = $2', [
      stripeCustomerId,
      accountId,
    ]);

    const credits = subscriptionCredits || 500;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: stripeSubPriceId, quantity: 1 }],
      client_reference_id: accountId,
      metadata: { accountId, kind: 'subscription', credits },
      customer: stripeCustomerId,
      subscription_data: { metadata: { accountId, kind: 'subscription', credits } },
      success_url: billingSuccessUrl,
      cancel_url: billingCancelUrl,
    });

    return res.json({
      ok: true,
      url: session.url,
      accountId,
      tenantId,
      apiKey,
      email: normalizedEmail,
    });
  } catch (err) {
    console.error('Signup+subscribe error', err);
    const status = err.status || 500;
    return res.status(status).json({ ok: false, error: err.message || 'Signup failed' });
  }
});

// Auth: login for dashboard (returns basic account info only)
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const result = await pool.query(
      'SELECT id, password_hash FROM accounts WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (!result.rows.length) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password' });
    }

    const account = result.rows[0];
    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password' });
    }

    // For now just echo basic info; session/JWT can be added later for dashboard auth
    return res.json({ ok: true, accountId: account.id, email: normalizedEmail });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

// Basic account/profile info. For now this is keyed by accountId from the client.
app.get('/me', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'accountId is required' });
    }

    const accountRes = await pool.query(
      'SELECT email FROM accounts WHERE id = $1 LIMIT 1',
      [accountId]
    );
    if (!accountRes.rows.length) {
      return res.status(404).json({ ok: false, error: 'Account not found' });
    }

    const tenantsRes = await pool.query(
      'SELECT id, name FROM tenants WHERE account_id = $1',
      [accountId]
    );
    const primaryTenant = tenantsRes.rows[0] || {};

    return res.json({
      ok: true,
      accountId,
      email: accountRes.rows[0].email,
      primaryTenantName: primaryTenant.name || null,
      tenantCount: tenantsRes.rows.length,
    });
  } catch (err) {
    console.error('Me endpoint error', err);
    return res.status(500).json({ ok: false, error: 'Could not load account info' });
  }
});

// Usage summary for an account (simple aggregation by accountId)
app.get('/me/usage', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'accountId is required' });
    }

    const tenantsRes = await pool.query(
      'SELECT id, name FROM tenants WHERE account_id = $1',
      [accountId]
    );
    const tenantIds = tenantsRes.rows.map(r => r.id);

    if (!tenantIds.length) {
      return res.json({
        ok: true,
        accountId,
        primaryTenantName: null,
        tenantCount: 0,
        totalRequests: 0,
        totalLatencyMs: 0,
        totalTokens: 0,
        totalRedactions: 0,
        providerCostCents: 0,
        billedCents: 0,
      });
    }

    const usageRes = await pool.query(
      'SELECT COUNT(*) AS total_requests, COALESCE(SUM(latency_ms),0) AS total_latency, COALESCE(SUM(total_tokens),0) AS total_tokens, COALESCE(SUM(redactions_count),0) AS total_redactions, COALESCE(SUM(provider_cost_cents),0) AS provider_cost_cents, COALESCE(SUM(billed_cents),0) AS billed_cents FROM usage_logs WHERE tenant_id = ANY($1::text[])',
      [tenantIds]
    );

    const row = usageRes.rows[0] || {};
    const primaryTenant = tenantsRes.rows[0] || {};

    // Aggregate balances across all tenants for this account
    const balancesRes = await pool.query(
      'SELECT plan, COALESCE(SUM(credits_remaining),0) AS total_credits FROM balances WHERE tenant_id = ANY($1::text[]) GROUP BY plan ORDER BY total_credits DESC LIMIT 1',
      [tenantIds]
    );
    const balanceRow = balancesRes.rows[0] || null;

    return res.json({
      ok: true,
      accountId,
      primaryTenantName: primaryTenant.name || null,
      tenantCount: tenantsRes.rows.length,
      totalRequests: Number(row.total_requests || 0),
      totalLatencyMs: Number(row.total_latency || 0),
      totalTokens: Number(row.total_tokens || 0),
      totalRedactions: Number(row.total_redactions || 0),
      providerCostCents: Number(row.provider_cost_cents || 0),
      billedCents: Number(row.billed_cents || 0),
      plan: balanceRow ? balanceRow.plan : null,
      creditsRemainingCents: balanceRow ? Number(balanceRow.total_credits || 0) : 0,
    });
  } catch (err) {
    console.error('Usage summary error', err);
    return res.status(500).json({ ok: false, error: 'Could not load usage' });
  }
});

// Simple report builder for an account (used by /me/report and email)
async function buildAccountReport(accountId) {
  const accountRes = await pool.query('SELECT email FROM accounts WHERE id = $1 LIMIT 1', [
    accountId,
  ]);
  if (!accountRes.rows.length) {
    throw new Error('Account not found');
  }
  const email = accountRes.rows[0].email;

  const tenantsRes = await pool.query(
    'SELECT id, name FROM tenants WHERE account_id = $1',
    [accountId]
  );
  const tenantIds = tenantsRes.rows.map(r => r.id);

  if (!tenantIds.length) {
    return {
      accountId,
      email,
      tenantCount: 0,
      primaryTenantName: null,
      totalRequests: 0,
      totalTokens: 0,
      totalRedactions: 0,
      providerCostCents: 0,
      billedCents: 0,
    };
  }

  const usageRes = await pool.query(
    'SELECT COUNT(*) AS total_requests, COALESCE(SUM(total_tokens),0) AS total_tokens, COALESCE(SUM(redactions_count),0) AS total_redactions, COALESCE(SUM(provider_cost_cents),0) AS provider_cost_cents, COALESCE(SUM(billed_cents),0) AS billed_cents FROM usage_logs WHERE tenant_id = ANY($1::text[])',
    [tenantIds]
  );
  const row = usageRes.rows[0] || {};

  return {
    accountId,
    email,
    tenantCount: tenantsRes.rows.length,
    primaryTenantName: tenantsRes.rows[0]?.name || null,
    totalRequests: Number(row.total_requests || 0),
    totalTokens: Number(row.total_tokens || 0),
    totalRedactions: Number(row.total_redactions || 0),
    providerCostCents: Number(row.provider_cost_cents || 0),
    billedCents: Number(row.billed_cents || 0),
  };
}

app.get('/me/report', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'accountId is required' });
    }
    const report = await buildAccountReport(accountId);
    return res.json({ ok: true, report });
  } catch (err) {
    console.error('Report error', err);
    return res.status(500).json({ ok: false, error: 'Could not build report' });
  }
});

// Billing history (minimal): last successful Stripe payment we recorded for this account.
app.get('/me/billing', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'accountId is required' });
    }

    const payRes = await pool.query(
      `SELECT amount_cents, currency, COALESCE(stripe_created_at, created_at) AS paid_at, kind
       FROM stripe_payments
       WHERE account_id = $1
       ORDER BY COALESCE(stripe_created_at, created_at) DESC
       LIMIT 1`,
      [accountId]
    );

    const row = payRes.rows[0] || null;
    return res.json({
      ok: true,
      lastPayment: row
        ? {
            amountCents: Number(row.amount_cents || 0),
            currency: row.currency || 'usd',
            paidAt: row.paid_at,
            kind: row.kind,
          }
        : null,
    });
  } catch (err) {
    console.error('Billing history error', err);
    return res.status(500).json({ ok: false, error: 'Could not load billing history' });
  }
});

// Global aggregate usage for marketing / analytics
app.get('/usage', async (req, res) => {
  try {
    const usageRes = await pool.query(
      'SELECT COUNT(*) AS total_requests, COALESCE(SUM(latency_ms),0) AS total_latency, COALESCE(SUM(tokens),0) AS total_tokens, COALESCE(SUM(redactions_count),0) AS total_redactions FROM usage_logs'
    );

    const row = usageRes.rows[0] || {};

    return res.json({
      ok: true,
      totalRequests: Number(row.total_requests || 0),
      totalLatencyMs: Number(row.total_latency || 0),
      totalTokens: Number(row.total_tokens || 0),
      totalRedactions: Number(row.total_redactions || 0),
    });
  } catch (err) {
    console.error('Global usage summary error', err);
    return res.status(500).json({ ok: false, error: 'Could not load global usage' });
  }
});

// Simple tenant API key auth middleware for /query
async function tenantAuth(req, res, next) {
  try {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Missing or invalid Authorization header' });
    }
    const apiKey = auth.slice('Bearer '.length).trim();
    if (!apiKey) {
      return res.status(401).json({ ok: false, error: 'API key required' });
    }

    const apiKeyHash = hashApiKey(apiKey);
    const result = await pool.query('SELECT id FROM tenants WHERE api_key_hash = $1 LIMIT 1', [
      apiKeyHash,
    ]);

    if (!result.rows.length) {
      return res.status(403).json({ ok: false, error: 'Invalid API key' });
    }

    req.tenantId = result.rows[0].id;
    next();
  } catch (err) {
    console.error('tenantAuth error', err);
    return res.status(500).json({ ok: false, error: 'Auth failed' });
  }
}

// Privacy-proxy endpoint
// Scrubs identity from prompt/metadata, then calls Anthropic with the scrubbed prompt.
app.post('/proxy', async (req, res) => {
  try {
    const { prompt, metadata, model } = req.body || {};

    // Instance-level, anonymous telemetry: count requests only when
    // QUIETER_TELEMETRY_ENABLED=true. This never inspects prompt content
    // or any identifiers.
    recordTelemetryRequest('proxy');

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing or invalid "prompt"' });
    }

    // Basic redaction example (can be replaced with more robust scrubber):
    // Phase 1: names, SSN-style IDs, and emails
    let redactions = 0;
    redactions += countMatches(prompt, /\b[A-Z][a-z]+ [A-Z][a-z]+\b/);
    redactions += countMatches(prompt, /\b\d{3}-\d{2}-\d{4}\b/);
    redactions += countMatches(prompt, /[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);

    let scrubbedPrompt = prompt
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[redacted-name]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]')
      .replace(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]');

    // Phase 2: crypto-related secrets and wallet addresses
    // Seed phrases / private keys / recovery phrases (very rough heuristic)
    redactions += countMatches(scrubbedPrompt, /(seed phrase|recovery phrase|mnemonic phrase|private key|wallet seed)/i);
    scrubbedPrompt = scrubbedPrompt.replace(
      /(seed phrase|recovery phrase|mnemonic phrase|private key|wallet seed)/gi,
      '[redacted-crypto-secret]'
    );
    // Ethereum-style addresses
    redactions += countMatches(scrubbedPrompt, /\b0x[a-fA-F0-9]{40}\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b0x[a-fA-F0-9]{40}\b/g,
      '[redacted-eth-address]'
    );
    // Bitcoin-style base58 addresses (simple length-based heuristic)
    redactions += countMatches(scrubbedPrompt, /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
      '[redacted-btc-address]'
    );

    // Phase 3: financial account / card-like patterns
    // Common credit card-like sequences (very approximate)
    redactions += countMatches(scrubbedPrompt, /\b(?:\d[ -]*?){13,16}\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b(?:\d[ -]*?){13,16}\b/g,
      '[redacted-card-or-account]'
    );
    // Long digit runs that look like account or investment IDs
    redactions += countMatches(scrubbedPrompt, /\b\d{10,20}\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b\d{10,20}\b/g,
      '[redacted-account-number]'
    );

    // Phase 4: medical diagnostic hints (very coarse for now)
    // ICD-10 style codes (e.g. F32.1, E11.9)
    redactions += countMatches(scrubbedPrompt, /\b[ABDEGHJKLMNPRSTVWXYZ]\d{2}(?:\.\d{1,4})?\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b[ABDEGHJKLMNPRSTVWXYZ]\d{2}(?:\.\d{1,4})?\b/g,
      '[redacted-medical-code]'
    );
    // Lines starting with Diagnosis:
    redactions += countMatches(scrubbedPrompt, /(Diagnosis\s*:\s*)(.+)/i);
    scrubbedPrompt = scrubbedPrompt.replace(
      /(Diagnosis\s*:\s*)(.+)/gi,
      '$1[redacted-medical-diagnosis]'
    );

    const scrubbedMetadata = metadata
      ? { ...metadata, user: undefined, email: undefined, session_id: undefined }
      : undefined;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({
        ok: true,
        prompt: scrubbedPrompt,
        metadata: scrubbedMetadata,
        modelResponse: '[dev] ANTHROPIC_API_KEY not set; skipping model call.',
      });
    }

    const modelName = model || 'claude-3-5-haiku-latest';

    const start = Date.now();
    const message = await anthropic.messages.create({
      model: modelName,
      max_tokens: 256,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `You are a helpful assistant behind a privacy shield. Respond to the following scrubbed prompt:\n\n${scrubbedPrompt}`,
        },
      ],
    });
    const latencyMs = Date.now() - start;

    const textPart = message.content?.find?.(p => p.type === 'text');
    const modelText = textPart?.text || '';

    // For demo purposes, show a rough "before vs after" view of what a provider might see.
    // Left side: what your browser actually sent to Quieter (similar to sending directly to a GPT site).
    const rawHeaders = req.headers || {};
    const clientHeaders = Object.entries(rawHeaders)
      .filter(([k]) => !['authorization', 'cookie'].includes(k.toLowerCase()))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);

    const demoDirectView = {
      ip: req.ip || 'your client IP (as seen by Quieter)',
      headers: clientHeaders,
      body: prompt,
    };

    // Right side: what Quieter forwards to the provider.
    const demoQuieterView = {
      ip: 'Quieter.ai infrastructure',
      headers: [
        'Authorization: Bearer <Quieter’s provider key>',
        'Content-Type: application/json',
      ],
      body: {
        model: modelName,
        max_tokens: 256,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: `You are a helpful assistant behind a privacy shield. Respond to the following scrubbed prompt:\n\n${scrubbedPrompt}`,
          },
        ],
      },
    };

    return res.json({
      ok: true,
      prompt: scrubbedPrompt,
      metadata: scrubbedMetadata,
      model: modelName,
      latencyMs,
      modelResponse: modelText,
      demoDirectView,
      demoQuieterView,
    });
  } catch (err) {
    console.error('Proxy error', err);
    return res.status(500).json({ ok: false, error: 'Proxy failed' });
  }
});

// Helper: resolve a model based on requested name or "auto" using model_configs
async function resolveModelConfig(requestedModel) {
  const defaultModelId = process.env.QUIETER_DEFAULT_MODEL_ID;
  if ((!requestedModel || requestedModel === 'auto') && defaultModelId) {
    const res = await pool.query(
      'SELECT * FROM model_configs WHERE id = $1 AND enabled = TRUE LIMIT 1',
      [defaultModelId]
    );
    if (res.rows.length) {
      return res.rows[0];
    }
    console.warn('QUIETER_DEFAULT_MODEL_ID not found or disabled:', defaultModelId);
  }

  // Explicit model id: look it up
  if (requestedModel && requestedModel !== 'auto') {
    const res = await pool.query(
      'SELECT * FROM model_configs WHERE id = $1 AND enabled = TRUE LIMIT 1',
      [requestedModel]
    );
    if (!res.rows.length) {
      throw new Error('Requested model is not available');
    }
    return res.rows[0];
  }

  // Auto: choose cheapest enabled model, favoring higher quality if prices tie
  const res = await pool.query(
    `SELECT * FROM model_configs
     WHERE enabled = TRUE
     ORDER BY price_input_per_1k_cs ASC, quality_score DESC NULLS LAST
     LIMIT 1`
  );
  if (!res.rows.length) {
    throw new Error('No models are configured');
  }
  return res.rows[0];
}

function computeCostsFromUsage(modelConfig, inputTokens, outputTokens) {
  const inTok = inputTokens || 0;
  const outTok = outputTokens || 0;
  const providerCost =
    Math.round((inTok / 1000) * modelConfig.price_input_per_1k_cs) +
    Math.round((outTok / 1000) * modelConfig.price_output_per_1k_cs);
  // For now we bill provider cost 1:1 to user; markup can be added later.
  const billed = providerCost;
  return { providerCostCents: providerCost, billedCents: billed };
}

// Tenant-aware /query endpoint (same pipeline as /proxy, but requires API key and logs usage)
app.post('/query', tenantAuth, async (req, res) => {
  try {
    const { prompt, metadata, model } = req.body || {};

    // Instance-level, anonymous telemetry: count requests only when
    // QUIETER_TELEMETRY_ENABLED=true. This never inspects prompt content
    // or any identifiers.
    recordTelemetryRequest('query');

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing or invalid "prompt"' });
    }

    // Reuse the same scrubber logic as /proxy for now
    let redactions = 0;
    redactions += countMatches(prompt, /\b[A-Z][a-z]+ [A-Z][a-z]+\b/);
    redactions += countMatches(prompt, /\b\d{3}-\d{2}-\d{4}\b/);
    redactions += countMatches(prompt, /[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);

    let scrubbedPrompt = prompt
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[redacted-name]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]')
      .replace(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]');

    redactions += countMatches(scrubbedPrompt, /(seed phrase|recovery phrase|mnemonic phrase|private key|wallet seed)/i);
    scrubbedPrompt = scrubbedPrompt.replace(
      /(seed phrase|recovery phrase|mnemonic phrase|private key|wallet seed)/gi,
      '[redacted-crypto-secret]'
    );
    redactions += countMatches(scrubbedPrompt, /\b0x[a-fA-F0-9]{40}\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b0x[a-fA-F0-9]{40}\b/g,
      '[redacted-eth-address]'
    );
    redactions += countMatches(scrubbedPrompt, /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
      '[redacted-btc-address]'
    );

    redactions += countMatches(scrubbedPrompt, /\b(?:\d[ -]*?){13,16}\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b(?:\d[ -]*?){13,16}\b/g,
      '[redacted-card-or-account]'
    );
    redactions += countMatches(scrubbedPrompt, /\b\d{10,20}\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b\d{10,20}\b/g,
      '[redacted-account-number]'
    );

    redactions += countMatches(scrubbedPrompt, /\b[ABDEGHJKLMNPRSTVWXYZ]\d{2}(?:\.\d{1,4})?\b/);
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b[ABDEGHJKLMNPRSTVWXYZ]\d{2}(?:\.\d{1,4})?\b/g,
      '[redacted-medical-code]'
    );
    redactions += countMatches(scrubbedPrompt, /(Diagnosis\s*:\s*)(.+)/i);
    scrubbedPrompt = scrubbedPrompt.replace(
      /(Diagnosis\s*:\s*)(.+)/gi,
      '$1[redacted-medical-diagnosis]'
    );

    const scrubbedMetadata = metadata
      ? { ...metadata, user: undefined, email: undefined, session_id: undefined }
      : undefined;

    const modelConfig = await resolveModelConfig(model || 'auto');
    const modelName = modelConfig.api_model_name;
    const maxTokensRaw = req.body?.max_tokens ?? req.body?.maxTokens;
    const temperatureRaw = req.body?.temperature;
    const systemPrompt = req.body?.system ?? req.body?.systemPrompt;
    const maxTokens = Number.isFinite(Number(maxTokensRaw))
      ? Math.min(Math.max(Number(maxTokensRaw), 1), 4096)
      : 512;
    const temperature = Number.isFinite(Number(temperatureRaw))
      ? Math.min(Math.max(Number(temperatureRaw), 0), 1)
      : 0.7;

    const payload = {
      model: modelName,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: scrubbedPrompt,
        },
      ],
    };
    if (systemPrompt && typeof systemPrompt === 'string') {
      payload.system = systemPrompt;
    }

    const start = Date.now();
    const message = await anthropic.messages.create(payload);
    const latencyMs = Date.now() - start;

    const textPart = message.content?.find?.(p => p.type === 'text');
    const modelText = textPart?.text || '';

    // Use provider usage if available, otherwise fall back to rough estimate
    const inputTokens = message.usage?.input_tokens ?? Math.round(scrubbedPrompt.length / 4);
    const outputTokens = message.usage?.output_tokens ?? Math.round(modelText.length / 4);
    const totalTokens = inputTokens + outputTokens;

    const { providerCostCents, billedCents } = computeCostsFromUsage(
      modelConfig,
      inputTokens,
      outputTokens
    );

    const usageId = crypto.randomUUID();
    try {
      await pool.query(
        `INSERT INTO usage_logs
          (id, tenant_id, model, latency_ms, tokens, redactions_count, status,
           model_config_id, input_tokens, output_tokens, total_tokens,
           provider_cost_cents, billed_cents)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 $8, $9, $10, $11, $12, $13)`,
        [
          usageId,
          req.tenantId,
          modelConfig.id,
          latencyMs,
          totalTokens,
          redactions,
          'success',
          modelConfig.id,
          inputTokens,
          outputTokens,
          totalTokens,
          providerCostCents,
          billedCents,
        ]
      );

      // Decrement credits from this tenant's balance if present
      await pool.query(
        'UPDATE balances SET credits_remaining = COALESCE(credits_remaining,0) - $1, updated_at = NOW() WHERE tenant_id = $2',
        [billedCents, req.tenantId]
      );
    } catch (logErr) {
      console.error('Failed to log usage or update balance', logErr);
    }

    return res.json({
      ok: true,
      prompt: scrubbedPrompt,
      metadata: scrubbedMetadata,
      model: modelConfig.id,
      latencyMs,
      modelResponse: modelText,
      inputTokens,
      outputTokens,
      totalTokens,
      providerCostCents,
      billedCents,
    });
  } catch (err) {
    console.error('Query error', err);

    if (req.tenantId) {
      const usageId = crypto.randomUUID();
      try {
        await pool.query(
          'INSERT INTO usage_logs (id, tenant_id, model, latency_ms, status) VALUES ($1, $2, $3, $4, $5)',
          [usageId, req.tenantId, null, null, 'error']
        );
      } catch (logErr) {
        console.error('Failed to log error usage', logErr);
      }
    }

    return res.status(500).json({ ok: false, error: 'Query failed' });
  }
});

// --- Admin helpers and endpoints ---

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ ok: false, error: 'Admin is not configured' });
  }
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : null;
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Admin auth required' });
  }
  next();
}

// Minimal admin login: verify provided token matches ADMIN_TOKEN, purely for UI convenience.
app.post('/admin/login', (req, res) => {
  const { token, email, password } = req.body || {};
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ ok: false, error: 'Admin is not configured' });
  }

  // Path 1: shared admin token
  if (token) {
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ ok: false, error: 'Invalid admin token' });
    }
    return res.json({ ok: true, token: ADMIN_TOKEN });
  }

  // Path 2: email/password for allowlisted admins
  if (email && password) {
    const normalizedEmail = String(email).toLowerCase().trim();
    if (!adminEmails.has(normalizedEmail)) {
      return res.status(401).json({ ok: false, error: 'Not an admin account' });
    }
    return pool
      .query('SELECT id, password_hash FROM accounts WHERE email = $1 LIMIT 1', [normalizedEmail])
      .then(async (result) => {
        if (!result.rows.length) {
          return res.status(401).json({ ok: false, error: 'Invalid credentials' });
        }
        const row = result.rows[0];
        const valid = await bcrypt.compare(password, row.password_hash);
        if (!valid) {
          return res.status(401).json({ ok: false, error: 'Invalid credentials' });
        }
        return res.json({ ok: true, token: ADMIN_TOKEN });
      })
      .catch((err) => {
        console.error('Admin login error', err);
        return res.status(500).json({ ok: false, error: 'Admin login failed' });
      });
  }

  return res.status(400).json({ ok: false, error: 'Provide token or email/password' });
});

// List models
app.get('/admin/models', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM model_configs ORDER BY id');
    return res.json({ ok: true, models: result.rows });
  } catch (err) {
    console.error('Admin models list error', err);
    return res.status(500).json({ ok: false, error: 'Could not load models' });
  }
});

// Create model
app.post('/admin/models', requireAdmin, async (req, res) => {
  try {
    const {
      id,
      provider,
      display_name,
      api_model_name,
      tier = 'cheap',
      quality_score = null,
      price_input_per_1k_cs,
      price_output_per_1k_cs,
      enabled = true,
    } = req.body || {};

    if (!id || !provider || !display_name || !api_model_name || price_input_per_1k_cs == null || price_output_per_1k_cs == null) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    await pool.query(
      `INSERT INTO model_configs
        (id, provider, display_name, api_model_name, tier, quality_score,
         price_input_per_1k_cs, price_output_per_1k_cs, enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        provider,
        display_name,
        api_model_name,
        tier,
        quality_score,
        price_input_per_1k_cs,
        price_output_per_1k_cs,
        enabled,
      ]
    );

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Admin create model error', err);
    return res.status(500).json({ ok: false, error: 'Could not create model' });
  }
});

// Update model
app.patch('/admin/models/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const fields = [
      'provider',
      'display_name',
      'api_model_name',
      'tier',
      'quality_score',
      'price_input_per_1k_cs',
      'price_output_per_1k_cs',
      'enabled',
    ];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const field of fields) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates.push(`${field} = $${idx}`);
        values.push(req.body[field]);
        idx += 1;
      }
    }
    if (!updates.length) {
      return res.status(400).json({ ok: false, error: 'No fields to update' });
    }
    values.push(id);
    const sql = `UPDATE model_configs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`;
    await pool.query(sql, values);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Admin update model error', err);
    return res.status(500).json({ ok: false, error: 'Could not update model' });
  }
});

// Admin: simple account lookup by email
app.get('/admin/accounts', requireAdmin, async (req, res) => {
  try {
    const email = (req.query.email || '').toString().toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ ok: false, error: 'email query param is required' });
    }
    const accountRes = await pool.query(
      'SELECT id, email, created_at FROM accounts WHERE email = $1 LIMIT 1',
      [email]
    );
    if (!accountRes.rows.length) {
      return res.status(404).json({ ok: false, error: 'Account not found' });
    }
    const account = accountRes.rows[0];
    const tenantsRes = await pool.query(
      'SELECT id, name, plan FROM tenants WHERE account_id = $1',
      [account.id]
    );
    const balancesRes = await pool.query(
      'SELECT tenant_id, credits_remaining, plan FROM balances WHERE tenant_id = ANY($1::text[])',
      [tenantsRes.rows.map(t => t.id)]
    );
    return res.json({
      ok: true,
      account,
      tenants: tenantsRes.rows,
      balances: balancesRes.rows,
    });
  } catch (err) {
    console.error('Admin accounts lookup error', err);
    return res.status(500).json({ ok: false, error: 'Could not lookup account' });
  }
});

// Admin: list accounts with summary (pagination)
app.get('/admin/accounts/list', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const accountsRes = await pool.query(
      `SELECT id, email, created_at FROM accounts
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const accounts = accountsRes.rows;
    const accountIds = accounts.map((a) => a.id);

    // Aggregate balances per account
    const balancesRes = await pool.query(
      `SELECT t.account_id, COALESCE(SUM(b.credits_remaining),0) AS credits
       FROM balances b
       JOIN tenants t ON b.tenant_id = t.id
       WHERE t.account_id = ANY($1::text[])
       GROUP BY t.account_id`,
      [accountIds]
    );
    const balanceMap = new Map(balancesRes.rows.map((r) => [r.account_id, Number(r.credits || 0)]));

    // Tenant counts
    const tenantCountsRes = await pool.query(
      `SELECT account_id, COUNT(*) AS tenant_count
       FROM tenants
       WHERE account_id = ANY($1::text[])
       GROUP BY account_id`,
      [accountIds]
    );
    const tenantCountMap = new Map(
      tenantCountsRes.rows.map((r) => [r.account_id, Number(r.tenant_count || 0)])
    );

    // Last payment per account
    const paymentsRes = await pool.query(
      `SELECT account_id, MAX(COALESCE(stripe_created_at, created_at)) AS last_payment_at
       FROM stripe_payments
       WHERE account_id = ANY($1::text[])
       GROUP BY account_id`,
      [accountIds]
    );
    const paymentMap = new Map(
      paymentsRes.rows.map((r) => [r.account_id, r.last_payment_at || null])
    );

    // Last usage per account
    const usageRes = await pool.query(
      `SELECT t.account_id, MAX(u.created_at) AS last_usage_at
       FROM usage_logs u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE t.account_id = ANY($1::text[])
       GROUP BY t.account_id`,
      [accountIds]
    );
    const usageMap = new Map(
      usageRes.rows.map((r) => [r.account_id, r.last_usage_at || null])
    );

    const results = accounts.map((a) => ({
      id: a.id,
      email: a.email,
      createdAt: a.created_at,
      credits: balanceMap.get(a.id) || 0,
      tenantCount: tenantCountMap.get(a.id) || 0,
      lastPaymentAt: paymentMap.get(a.id) || null,
      lastUsageAt: usageMap.get(a.id) || null,
      lastLoginAt: null, // not tracked yet
    }));

    return res.json({ ok: true, accounts: results });
  } catch (err) {
    console.error('Admin accounts list error', err);
    return res.status(500).json({ ok: false, error: 'Could not list accounts' });
  }
});

// Admin: create an account (no checkout; for support use)
app.post('/admin/accounts', requireAdmin, async (req, res) => {
  try {
    const { email, password, tenantName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'email and password are required' });
    }
    const { accountId, tenantId, apiKey, normalizedEmail } = await createAccountWithDefaults({
      email,
      password,
      tenantName,
    });
    return res.json({ ok: true, accountId, tenantId, apiKey, email: normalizedEmail });
  } catch (err) {
    console.error('Admin create account error', err);
    const status = err.status || 500;
    return res.status(status).json({ ok: false, error: err.message || 'Could not create account' });
  }
});

// Admin: delete an account (dangerous; cascades via FK)
app.delete('/admin/accounts/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id is required' });
    }
    await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Admin delete account error', err);
    return res.status(500).json({ ok: false, error: 'Could not delete account' });
  }
});

// Admin: reset password for an account
app.post('/admin/accounts/:id/password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    const { password } = req.body || {};
    if (!id || !password) {
      return res.status(400).json({ ok: false, error: 'id and password are required' });
    }
    const passwordHash = await bcrypt.hash(String(password), 12);
    await pool.query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Admin reset password error', err);
    return res.status(500).json({ ok: false, error: 'Could not reset password' });
  }
});

// Admin: rotate API key for an account's primary tenant (first tenant)
app.post('/admin/accounts/:id/api-key', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id is required' });
    }
    const tenantRes = await pool.query('SELECT id FROM tenants WHERE account_id = $1 ORDER BY created_at ASC LIMIT 1', [id]);
    if (!tenantRes.rows.length) {
      return res.status(404).json({ ok: false, error: 'No tenant found for this account' });
    }
    const tenantId = tenantRes.rows[0].id;
    const rawApiKey = 'qtr_' + crypto.randomBytes(24).toString('base64url');
    const apiKeyHash = hashApiKey(rawApiKey);
    await pool.query('UPDATE tenants SET api_key_hash = $1 WHERE id = $2', [apiKeyHash, tenantId]);
    return res.json({ ok: true, apiKey: rawApiKey, tenantId });
  } catch (err) {
    console.error('Admin rotate API key error', err);
    return res.status(500).json({ ok: false, error: 'Could not rotate API key' });
  }
});

// Admin: usage summary per account (simple aggregation)
app.get('/admin/accounts/:id/usage', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id is required' });
    }
    const usageRes = await pool.query(
      `SELECT
         COUNT(*) AS total_requests,
         COALESCE(SUM(total_tokens),0) AS total_tokens,
         COALESCE(SUM(redactions_count),0) AS total_redactions,
         COALESCE(SUM(provider_cost_cents),0) AS provider_cost_cents,
         COALESCE(SUM(billed_cents),0) AS billed_cents
       FROM usage_logs u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE t.account_id = $1`,
      [id]
    );
    const row = usageRes.rows[0] || {};
    return res.json({
      ok: true,
      usage: {
        totalRequests: Number(row.total_requests || 0),
        totalTokens: Number(row.total_tokens || 0),
        totalRedactions: Number(row.total_redactions || 0),
        providerCostCents: Number(row.provider_cost_cents || 0),
        billedCents: Number(row.billed_cents || 0),
      },
    });
  } catch (err) {
    console.error('Admin usage summary error', err);
    return res.status(500).json({ ok: false, error: 'Could not load usage' });
  }
});

// Admin: per-model usage breakdown for an account
app.get('/admin/accounts/:id/usage/models', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id is required' });
    }
    const usageRes = await pool.query(
      `SELECT u.model_config_id,
              COUNT(*) AS total_requests,
              COALESCE(SUM(total_tokens),0) AS total_tokens,
              COALESCE(SUM(provider_cost_cents),0) AS provider_cost_cents,
              COALESCE(SUM(billed_cents),0) AS billed_cents
       FROM usage_logs u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE t.account_id = $1
       GROUP BY u.model_config_id
       ORDER BY COALESCE(SUM(total_tokens),0) DESC`,
      [id]
    );
    return res.json({ ok: true, models: usageRes.rows });
  } catch (err) {
    console.error('Admin model usage error', err);
    return res.status(500).json({ ok: false, error: 'Could not load model usage' });
  }
});

// Admin: export usage logs (CSV) for an account
app.get('/admin/accounts/:id/usage/export', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id is required' });
    }
    const limit = Math.min(Number(req.query.limit) || 5000, 20000);
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : null;
    const start = req.query.start ? new Date(req.query.start) : null;
    const end = req.query.end ? new Date(req.query.end) : null;

    const usageRes = await pool.query(
      `SELECT u.id, u.created_at, u.model_config_id, u.total_tokens, u.redactions_count,
              u.provider_cost_cents, u.billed_cents, u.status, u.tenant_id
       FROM usage_logs u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE t.account_id = $1
         AND ($2::text IS NULL OR u.tenant_id = $2)
         AND ($3::timestamptz IS NULL OR u.created_at >= $3)
         AND ($4::timestamptz IS NULL OR u.created_at <= $4)
       ORDER BY u.created_at DESC
       LIMIT $5`,
      [id, tenantId, start, end, limit]
    );
    const rows = usageRes.rows || [];
    const header = [
      'id',
      'created_at',
      'model_config_id',
      'total_tokens',
      'redactions_count',
      'provider_cost_cents',
      'billed_cents',
      'status',
      'tenant_id',
    ];
    const csvLines = [header.join(',')];
    for (const r of rows) {
      const fields = header.map((key) => {
        const val = r[key];
        if (val === null || val === undefined) return '';
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
      });
      csvLines.push(fields.join(','));
    }
    const csv = csvLines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="usage-${id}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('Admin usage export error', err);
    return res.status(500).json({ ok: false, error: 'Could not export usage' });
  }
});

// Admin: per-model usage breakdown for an account
// Admin: rotate API key for a specific tenant
app.post('/admin/tenants/:id/api-key', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id is required' });
    }
    const tenantRes = await pool.query('SELECT id FROM tenants WHERE id = $1 LIMIT 1', [id]);
    if (!tenantRes.rows.length) {
      return res.status(404).json({ ok: false, error: 'Tenant not found' });
    }
    const rawApiKey = 'qtr_' + crypto.randomBytes(24).toString('base64url');
    const apiKeyHash = hashApiKey(rawApiKey);
    await pool.query('UPDATE tenants SET api_key_hash = $1 WHERE id = $2', [apiKeyHash, id]);
    return res.json({ ok: true, apiKey: rawApiKey, tenantId: id });
  } catch (err) {
    console.error('Admin rotate tenant API key error', err);
    return res.status(500).json({ ok: false, error: 'Could not rotate tenant API key' });
  }
});

// Admin: send a one-off usage report email to a given account
app.post('/admin/send-report', requireAdmin, async (req, res) => {
  try {
    const { accountId } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'accountId is required' });
    }
    const report = await buildAccountReport(accountId);

    if (!mailTransport) {
      console.log('[report-email-dev]', report);
      return res.json({ ok: true, delivered: false, message: 'SMTP_URL not set; logged report instead' });
    }

    const textLines = [
      `Hi,`,
      '',
      `Here is your latest Quieter.ai privacy usage report:`,
      '',
      `Conversations shielded: ${report.totalRequests}`,
      `Approximate private tokens: ${report.totalTokens}`,
      `Redactions applied: ${report.totalRedactions}`,
      '',
      `Estimated provider cost: $${(report.providerCostCents / 100).toFixed(2)}`,
      `Your billed amount: $${(report.billedCents / 100).toFixed(2)}`,
      '',
      `Thanks for using Quieter.ai.`,
    ];

    await mailTransport.sendMail({
      to: report.email,
      from: process.env.REPORTS_FROM_EMAIL || 'reports@quieter.ai',
      subject: 'Your Quieter.ai privacy usage report',
      text: textLines.join('\n'),
    });

    return res.json({ ok: true, delivered: true });
  } catch (err) {
    console.error('Admin send report error', err);
    return res.status(500).json({ ok: false, error: 'Could not send report' });
  }
});

// Admin: inspect current telemetry state and counters (safe, aggregate-only)
app.get('/admin/telemetry-debug', requireAdmin, (req, res) => {
  try {
    const snapshot = getTelemetryDebugSnapshot();
    return res.json({ ok: true, telemetry: snapshot });
  } catch (err) {
    console.error('Admin telemetry debug error', err);
    return res.status(500).json({ ok: false, error: 'Could not load telemetry debug info' });
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
