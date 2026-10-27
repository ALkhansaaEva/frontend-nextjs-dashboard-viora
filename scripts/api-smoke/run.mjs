#!/usr/bin/env node
// Minimal API smoke check. Verifies the configured backend is reachable and
// answering the real contract without requiring credentials. Authenticated
// flows are intentionally out of scope here.
//
// Local lab usage (opt-in, strict TLS):
//   VIORA_CA_CERT=../backend/deploy/tls/lab-ca.pem \
//   VIORA_RESOLVE=evaka.test:192.168.220.129 \
//   NEXT_PUBLIC_API_URL=https://evaka.test:4444/v1 \
//   node scripts/api-smoke/run.mjs

import https from 'node:https';
import fs from 'node:fs';

const baseUrl = (
  process.argv.find((a) => a.startsWith('--base-url='))?.slice(11) ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''
).replace(/\/+$/, '');

if (!baseUrl) {
  console.error(
    'API_SMOKE=FAIL NEXT_PUBLIC_API_URL is not set (or pass --base-url=...). There is no default backend.',
  );
  process.exit(1);
}

const [resolveHost, resolveIp] = (process.env.VIORA_RESOLVE || '').split(':');
const ca = process.env.VIORA_CA_CERT
  ? fs.readFileSync(process.env.VIORA_CA_CERT)
  : undefined;

function request(method, path, body) {
  const url = new URL(`${baseUrl}${path}`);
  const payload = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        ca,
        lookup:
          resolveHost && url.hostname === resolveHost
            ? (hostname, options, cb) =>
                options && options.all
                  ? cb(null, [{ address: resolveIp, family: 4 }])
                  : cb(null, resolveIp, 4)
            : undefined,
        headers: {
          accept: 'application/json',
          ...(payload
            ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }
            : {}),
        },
        timeout: 15000,
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode || 0, json, text });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const checks = [];
function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log(`API_SMOKE_BASE=${baseUrl}`);

  const health = await request('GET', '/health');
  const healthOk =
    health.status === 200 &&
    (health.json?.data?.status === 'ok' || health.json?.status === 'ok');
  record('health', healthOk, `HTTP ${health.status}`);

  const ready = await request('GET', '/health/ready');
  record('health/ready', ready.status === 200, `HTTP ${ready.status}`);

  const invalidLogin = await request('POST', '/auth/email/login', {
    email: 'smoke.invalid@example.invalid',
    password: 'not-a-real-password',
  });
  record(
    'login rejects invalid credentials',
    invalidLogin.status === 400 || invalidLogin.status === 401,
    `HTTP ${invalidLogin.status}`,
  );

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`API_SMOKE=${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed}`);
  console.log('API_SMOKE_NOTE authenticated MFA/device/deletion flows are not covered');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`API_SMOKE=FAIL ${error.message}`);
  process.exit(1);
});
