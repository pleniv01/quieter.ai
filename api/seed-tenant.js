import dotenv from 'dotenv';
import crypto from 'crypto';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

function generateApiKey() {
  return 'qtr_' + crypto.randomBytes(24).toString('base64url');
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const id = crypto.randomUUID();
    const name = process.env.SEED_TENANT_NAME || 'Seeded Tenant';
    const plan = process.env.SEED_TENANT_PLAN || 'dev';

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    await client.query(
      'INSERT INTO tenants (id, name, api_key_hash, plan) VALUES ($1, $2, $3, $4)',
      [id, name, apiKeyHash, plan]
    );

    console.log('Tenant created:');
    console.log('  id:      ', id);
    console.log('  name:    ', name);
    console.log('  plan:    ', plan);
    console.log('  apiKey:  ', apiKey);
    console.log('  apiKeyHash (stored in DB):', apiKeyHash);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Failed to seed tenant', err);
  process.exit(1);
});
