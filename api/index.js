import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

const app = express();
const port = process.env.PORT || 8000;

// Railway Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: false,
}));

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

// Very simple placeholder for the privacy-proxy endpoint
// This demonstrates the shape of the API and a naive scrubbing pass.
app.post('/proxy', async (req, res) => {
  try {
    const { prompt, metadata } = req.body || {};

    // Basic redaction example (you will replace this with something more robust):
    const scrubbedPrompt = typeof prompt === 'string'
      ? prompt
          .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[redacted-name]')
          .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]')
      : '';

    const scrubbedMetadata = metadata ? { ...metadata, user: undefined, email: undefined } : undefined;

    // TODO: call your chosen AI provider here with scrubbedPrompt + scrubbedMetadata

    return res.json({
      ok: true,
      prompt: scrubbedPrompt,
      metadata: scrubbedMetadata,
      note: 'This is a placeholder. No upstream AI call has been made yet.',
    });
  } catch (err) {
    console.error('Proxy error', err);
    return res.status(500).json({ ok: false, error: 'Proxy failed' });
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
