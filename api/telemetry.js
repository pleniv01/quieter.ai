import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Telemetry is strictly opt-in and disabled by default.
const ENABLED = process.env.QUIETER_TELEMETRY_ENABLED === 'true';

// Coarse interval: once per day. This is intentionally conservative.
const TELEMETRY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Where to send instance-level telemetry. This can be changed by operators
// by editing this file; we intentionally do not hide this behind indirection
// so it is easy to inspect.
const TELEMETRY_ENDPOINT = 'https://telemetry.quieter.ai/v1/instance';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let instanceId = null;
let initialized = false;
let lastFlushAt = Date.now();

// Aggregate counters for this process. These are deliberately coarse and
// contain no per-request data.
const counters = {
  totalRequests: 0,
  proxyRequests: 0,
  queryRequests: 0,
};

// This object reflects which scrub layers are currently enabled. If you add
// configuration flags for scrubbers, update this to match.
const scrubLayersEnabled = {
  basicPiiScrubber: true,
  cryptoScrubber: true,
  financialScrubber: true,
  medicalScrubber: true,
};

function loadOrCreateInstanceId() {
  if (!ENABLED) return null;

  if (instanceId) return instanceId;

  const idPath = path.join(__dirname, '.quieter_instance_id');

  try {
    if (fs.existsSync(idPath)) {
      const raw = fs.readFileSync(idPath, 'utf8').trim();
      if (raw) {
        instanceId = raw;
        return instanceId;
      }
    }
  } catch (err) {
    // If we cannot read, fall through to creating a new one.
  }

  try {
    instanceId = crypto.randomUUID();
    // Best-effort write; ignore failures.
    try {
      fs.writeFileSync(idPath, instanceId, { encoding: 'utf8' });
    } catch (_) {
      // ignore
    }
    return instanceId;
  } catch (err) {
    // If we fail to create an id for any reason, return null and effectively
    // disable telemetry for this process.
    return null;
  }
}

function getQuieterVersion() {
  // Try to read the repo root package.json, then fall back to the api/package.json
  // and finally to an explicit env override. All of these are instance-level only.
  try {
    const rootPkgPath = path.resolve(__dirname, '..', 'package.json');
    if (fs.existsSync(rootPkgPath)) {
      const raw = fs.readFileSync(rootPkgPath, 'utf8');
      const pkg = JSON.parse(raw);
      if (pkg && typeof pkg.version === 'string') return pkg.version;
    }
  } catch (_) {
    // ignore
  }

  try {
    const apiPkgPath = path.resolve(__dirname, 'package.json');
    if (fs.existsSync(apiPkgPath)) {
      const raw = fs.readFileSync(apiPkgPath, 'utf8');
      const pkg = JSON.parse(raw);
      if (pkg && typeof pkg.version === 'string') return pkg.version;
    }
  } catch (_) {
    // ignore
  }

  if (process.env.QUIETER_VERSION) return process.env.QUIETER_VERSION;

  return 'unknown';
}

function buildPayloadAndReset() {
  const id = loadOrCreateInstanceId();
  if (!id) return null;

  const now = Date.now();
  const intervalSeconds = Math.round((now - lastFlushAt) / 1000);
  lastFlushAt = now;

  const snapshot = {
    totalRequests: counters.totalRequests,
    proxyRequests: counters.proxyRequests,
    queryRequests: counters.queryRequests,
  };

  // Reset counters for the next interval.
  counters.totalRequests = 0;
  counters.proxyRequests = 0;
  counters.queryRequests = 0;

  return {
    instance_id: id,
    quieter_version: getQuieterVersion(),
    scrub_layers_enabled: scrubLayersEnabled,
    interval_seconds: intervalSeconds,
    counts: snapshot,
  };
}

async function sendTelemetryIfNeeded() {
  if (!ENABLED) return;

  // If nothing has happened since the last flush, do nothing.
  if (counters.totalRequests <= 0) return;

  const payload = buildPayloadAndReset();
  if (!payload) return;

  try {
    // Node 18+ has global fetch available. If it is not available, this will
    // throw and be silently ignored below.
    if (typeof fetch !== 'function') return;

    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // This payload is intentionally small, instance-level only, and contains
      // no per-user, per-tenant, or per-request data.
      body: JSON.stringify(payload),
    });
  } catch (_) {
    // Failures are intentionally ignored and must never impact request flow.
    return;
  }
}

export function initTelemetry() {
  if (!ENABLED || initialized) return;
  initialized = true;

  // Ensure we have an instance id early, but ignore failures.
  loadOrCreateInstanceId();

  // Coarse timer. This runs in the background and never blocks any request.
  setInterval(() => {
    // Fire and forget; we do not await this.
    void sendTelemetryIfNeeded();
  }, TELEMETRY_INTERVAL_MS).unref?.();
}

export function recordTelemetryRequest(kind) {
  if (!ENABLED) return;

  counters.totalRequests += 1;
  if (kind === 'proxy') counters.proxyRequests += 1;
  if (kind === 'query') counters.queryRequests += 1;
}

// Admin-only debug helper: returns a safe, high-level snapshot of telemetry
// configuration and aggregate counters. This intentionally mirrors what is
// actually sent over the wire, and never includes any per-request data.
export function getTelemetryDebugSnapshot() {
  const id = ENABLED ? loadOrCreateInstanceId() : null;

  return {
    enabled: ENABLED,
    instance_id: id,
    quieter_version: getQuieterVersion(),
    scrub_layers_enabled: scrubLayersEnabled,
    interval_ms: TELEMETRY_INTERVAL_MS,
    telemetry_endpoint: TELEMETRY_ENDPOINT,
    counts: {
      totalRequests: counters.totalRequests,
      proxyRequests: counters.proxyRequests,
      queryRequests: counters.queryRequests,
    },
  };
}
