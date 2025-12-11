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

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
