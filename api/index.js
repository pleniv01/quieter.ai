import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const { Pool } = pkg;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const app = express();
const port = process.env.PORT || 8000;

const hashApiKey = (key) =>
  crypto.createHash('sha256').update(key).digest('hex');

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
    let scrubbedPrompt = prompt
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[redacted-name]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]')
      .replace(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]');

    // Phase 2: crypto-related secrets and wallet addresses
    // Seed phrases / private keys / recovery phrases (very rough heuristic)
    scrubbedPrompt = scrubbedPrompt.replace(
      /(seed phrase|recovery phrase|mnemonic phrase|private key|wallet seed)/gi,
      '[redacted-crypto-secret]'
    );
    // Ethereum-style addresses
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b0x[a-fA-F0-9]{40}\b/g,
      '[redacted-eth-address]'
    );
    // Bitcoin-style base58 addresses (simple length-based heuristic)
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
      '[redacted-btc-address]'
    );

    // Phase 3: financial account / card-like patterns
    // Common credit card-like sequences (very approximate)
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b(?:\d[ -]*?){13,16}\b/g,
      '[redacted-card-or-account]'
    );
    // Long digit runs that look like account or investment IDs
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b\d{10,20}\b/g,
      '[redacted-account-number]'
    );

    // Phase 4: medical diagnostic hints (very coarse for now)
    // ICD-10 style codes (e.g. F32.1, E11.9)
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b[ABDEGHJKLMNPRSTVWXYZ]\d{2}(?:\.\d{1,4})?\b/g,
      '[redacted-medical-code]'
    );
    // Lines starting with Diagnosis:
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
    let scrubbedPrompt = prompt
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[redacted-name]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]')
      .replace(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]');

    scrubbedPrompt = scrubbedPrompt.replace(
      /(seed phrase|recovery phrase|mnemonic phrase|private key|wallet seed)/gi,
      '[redacted-crypto-secret]'
    );
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b0x[a-fA-F0-9]{40}\b/g,
      '[redacted-eth-address]'
    );
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
      '[redacted-btc-address]'
    );

    scrubbedPrompt = scrubbedPrompt.replace(
      /\b(?:\d[ -]*?){13,16}\b/g,
      '[redacted-card-or-account]'
    );
    scrubbedPrompt = scrubbedPrompt.replace(
      /\b\d{10,20}\b/g,
      '[redacted-account-number]'
    );

    scrubbedPrompt = scrubbedPrompt.replace(
      /\b[ABDEGHJKLMNPRSTVWXYZ]\d{2}(?:\.\d{1,4})?\b/g,
      '[redacted-medical-code]'
    );
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

    // Log basic usage for this tenant
    const usageId = crypto.randomUUID();
    try {
      await pool.query(
        'INSERT INTO usage_logs (id, tenant_id, model, latency_ms, status) VALUES ($1, $2, $3, $4, $5)',
        [usageId, req.tenantId, modelName, latencyMs, 'success']
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
