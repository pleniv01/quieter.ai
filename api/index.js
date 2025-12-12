import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
dotenv.config();

const { Pool } = pkg;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const app = express();
const port = process.env.PORT || 8000;

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

// Auth: signup creates account + tenant + initial balance + API key
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, tenantName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await pool.query('SELECT id FROM accounts WHERE email = $1 LIMIT 1', [
      normalizedEmail,
    ]);
    if (existing.rows.length) {
      return res.status(409).json({ ok: false, error: 'Account already exists' });
    }

    const accountId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      'INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, $3)',
      [accountId, normalizedEmail, passwordHash]
    );

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

    return res.status(201).json({
      ok: true,
      accountId,
      tenantId,
      apiKey: rawApiKey,
    });
  } catch (err) {
    console.error('Signup error', err);
    return res.status(500).json({ ok: false, error: 'Signup failed' });
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

// Usage summary for an account (simple aggregation by accountId)
app.get('/me/usage', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'accountId is required' });
    }

    const tenantsRes = await pool.query(
      'SELECT id FROM tenants WHERE account_id = $1',
      [accountId]
    );
    const tenantIds = tenantsRes.rows.map(r => r.id);

    if (!tenantIds.length) {
      return res.json({
        ok: true,
        accountId,
        totalRequests: 0,
        totalLatencyMs: 0,
        totalTokens: 0,
        totalRedactions: 0,
      });
    }

    const usageRes = await pool.query(
      'SELECT COUNT(*) AS total_requests, COALESCE(SUM(latency_ms),0) AS total_latency, COALESCE(SUM(tokens),0) AS total_tokens, COALESCE(SUM(redactions_count),0) AS total_redactions FROM usage_logs WHERE tenant_id = ANY($1::text[])',
      [tenantIds]
    );

    const row = usageRes.rows[0] || {};

    return res.json({
      ok: true,
      accountId,
      totalRequests: Number(row.total_requests || 0),
      totalLatencyMs: Number(row.total_latency || 0),
      totalTokens: Number(row.total_tokens || 0),
      totalRedactions: Number(row.total_redactions || 0),
    });
  } catch (err) {
    console.error('Usage summary error', err);
    return res.status(500).json({ ok: false, error: 'Could not load usage' });
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

    return res.json({
      ok: true,
      prompt: scrubbedPrompt,
      metadata: scrubbedMetadata,
      model: modelName,
      latencyMs,
      modelResponse: modelText,
    });
  } catch (err) {
    console.error('Proxy error', err);
    return res.status(500).json({ ok: false, error: 'Proxy failed' });
  }
});

// Tenant-aware /query endpoint (same pipeline as /proxy, but requires API key and logs usage)
app.post('/query', tenantAuth, async (req, res) => {
  try {
    const { prompt, metadata, model } = req.body || {};

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

    // Very rough token estimate: length / 4 (can be improved later)
    const approxTokens = Math.round(scrubbedPrompt.length / 4);

    // Log basic usage for this tenant
    const usageId = crypto.randomUUID();
    try {
      await pool.query(
        'INSERT INTO usage_logs (id, tenant_id, model, latency_ms, tokens, redactions_count, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [usageId, req.tenantId, modelName, latencyMs, approxTokens, redactions, 'success']
      );
    } catch (logErr) {
      console.error('Failed to log usage', logErr);
    }

    return res.json({
      ok: true,
      prompt: scrubbedPrompt,
      metadata: scrubbedMetadata,
      model: modelName,
      latencyMs,
      modelResponse: modelText,
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

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
