#!/usr/bin/env node
// Verifies that every static apiClient path in src/ exists in the backend's
// OpenAPI document, with the same HTTP method.
//
// The backend is authoritative: this script never edits or invents endpoints.
// It reads the live spec (`<origin>/docs-json`) or an offline file, and fails
// on an unknown path or a method the spec does not list for that path.
//
// Lab usage (strict TLS, same options as scripts/api-smoke/run.mjs):
//   VIORA_CA_CERT=../backend/deploy/tls/lab-ca.pem \
//   VIORA_RESOLVE=evaka.test:192.168.220.129 \
//   NEXT_PUBLIC_API_URL=https://evaka.test:4444/v1 \
//   node scripts/api-smoke/contract-audit.mjs
//
// Offline usage:
//   node scripts/api-smoke/contract-audit.mjs --spec=../backend/openapi.json

import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

function apiOrigin() {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (!base) return null;
  return base.replace(/\/v1$/, '');
}

function fetchJson(url) {
  const [resolveHost, resolveIp] = (process.env.VIORA_RESOLVE || '').split(':');
  const ca = process.env.VIORA_CA_CERT ? fs.readFileSync(process.env.VIORA_CA_CERT) : undefined;
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'GET',
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        ca,
        lookup:
          resolveHost && target.hostname === resolveHost
            ? (hostname, options, cb) =>
                options && options.all
                  ? cb(null, [{ address: resolveIp, family: 4 }])
                  : cb(null, resolveIp, 4)
            : undefined,
        headers: { accept: 'application/json' },
        timeout: 15000,
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          if ((res.statusCode || 0) >= 400) {
            reject(new Error(`${url} answered HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(text));
          } catch {
            reject(new Error(`${url} did not return JSON`));
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error(`timeout fetching ${url}`)));
    req.on('error', reject);
    req.end();
  });
}

async function loadSpec() {
  const source = arg('spec') || process.env.VIORA_OPENAPI;
  if (source) {
    const text = source.startsWith('http')
      ? await fetchJson(source)
      : JSON.parse(fs.readFileSync(source, 'utf8'));
    return { spec: text, from: source };
  }
  const origin = apiOrigin();
  if (!origin) {
    throw new Error('NEXT_PUBLIC_API_URL is not set (or pass --spec=...). There is no default backend.');
  }
  return { spec: await fetchJson(`${origin}/docs-json`), from: `${origin}/docs-json` };
}

const CALL = /apiClient\s*\.\s*(get|post|patch|put|delete)(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)[`'"]/g;

function collectCalls(root, dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  const calls = [];
  for (const entry of files) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      calls.push(...collectCalls(root, full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      let match;
      while ((match = CALL.exec(text))) {
        const raw = match[2];
        if (!raw.startsWith('/')) continue;
        calls.push({
          file: path.relative(root, full),
          method: match[1].toUpperCase(),
          path: raw.split('?')[0].replace(/\$\{[^}]+\}/g, '{param}'),
        });
      }
    }
  }
  return calls;
}

const normalize = (value) => value.replace(/\{[^}]+\}/g, '{}');

const { spec, from } = await loadSpec();
const specRoutes = new Map();
for (const [routePath, methods] of Object.entries(spec.paths || {})) {
  const relative = routePath.replace(/^\/v1/, '') || '/';
  // Two routes can differ only by param name (`equip/{inventoryId}` vs
  // `equip/{slot}`); normalize collapses them, so keep every method offered.
  const key = normalize(relative);
  const allowed = specRoutes.get(key) ?? new Set();
  for (const method of Object.keys(methods)) {
    if (METHODS.has(method)) allowed.add(method.toUpperCase());
  }
  specRoutes.set(key, allowed);
}
if (specRoutes.size === 0) {
  console.error(`CONTRACT_AUDIT=FAIL ${from} contains no paths`);
  process.exit(1);
}

const root = process.cwd();
const calls = collectCalls(root, path.join(root, 'src'));
const unknown = [];
const wrongMethod = [];
for (const call of calls) {
  const key = normalize(call.path);
  const allowed = specRoutes.get(key);
  if (!allowed) unknown.push(call);
  else if (!allowed.has(call.method)) wrongMethod.push({ ...call, allowed: [...allowed] });
}

console.log(`CONTRACT_SPEC=${from}`);
console.log(`CONTRACT_CALLS=${calls.length} CONTRACT_PATHS=${specRoutes.size}`);
console.log(`CONTRACT_UNKNOWN=${unknown.length} CONTRACT_METHOD_MISMATCH=${wrongMethod.length}`);
for (const call of unknown) console.log(`  UNKNOWN ${call.file} ${call.method} ${call.path}`);
for (const call of wrongMethod) {
  console.log(`  METHOD ${call.file} ${call.method} ${call.path} allowed=${call.allowed.join(',')}`);
}

if (unknown.length || wrongMethod.length) {
  console.error('CONTRACT_AUDIT=FAIL');
  process.exit(1);
}
console.log('CONTRACT_AUDIT=PASS');
