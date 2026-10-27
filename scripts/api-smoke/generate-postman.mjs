#!/usr/bin/env node
// Builds a Postman v2.1 collection from an authoritative OpenAPI document.
//
// The document is never invented: it is read from `--spec=<file|url>` or
// VIORA_OPENAPI, otherwise fetched from the backend's Swagger JSON
// (`<origin>/docs-json`). Operations, methods and paths come straight from the
// spec; only path/query placeholders are rendered as Postman variables.
//
// Lab usage (strict TLS, same options as scripts/api-smoke/run.mjs):
//   VIORA_CA_CERT=../backend/deploy/tls/lab-ca.pem \
//   VIORA_RESOLVE=evaka.test:192.168.220.129 \
//   NEXT_PUBLIC_API_URL=https://evaka.test:4444/v1 \
//   node scripts/api-smoke/generate-postman.mjs
//
// Offline usage:
//   node scripts/api-smoke/generate-postman.mjs --spec=../backend/openapi.json

import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const OUTPUT = arg('out') || 'viora-api-collection.json';
const SPEC_SOURCE = arg('spec') || process.env.VIORA_OPENAPI;

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
  if (SPEC_SOURCE) {
    if (/^https?:\/\//.test(SPEC_SOURCE)) return fetchJson(SPEC_SOURCE);
    return JSON.parse(fs.readFileSync(path.resolve(SPEC_SOURCE), 'utf8'));
  }
  const origin = apiOrigin();
  if (!origin) {
    throw new Error(
      'No OpenAPI source. Pass --spec=<file|url>, set VIORA_OPENAPI, or set NEXT_PUBLIC_API_URL so <origin>/docs-json can be fetched.',
    );
  }
  return fetchJson(`${origin}/docs-json`);
}

/** `/v1/users/{id}` → `users/:id` (the collection's baseUrl already ends in /v1). */
function toPostmanPath(specPath) {
  const withoutPrefix = specPath.replace(/^\/v1(?=\/|$)/, '');
  const segments = withoutPrefix.split('/').filter(Boolean);
  const variables = new Set();
  const rendered = segments.map((segment) => {
    const match = segment.match(/^\{(.+)\}$/);
    if (!match) return encodeURIComponent(segment);
    variables.add(match[1]);
    return `:${match[1]}`;
  });
  return { path: rendered, rawPath: `/${rendered.join('/')}`, variables: [...variables] };
}

function requestName(operation, method, specPath) {
  const name =
    operation.summary ||
    operation.operationId ||
    `${method.toUpperCase()} ${specPath}`;
  return operation.deprecated ? `${name} (deprecated)` : name;
}

function buildRequest(operation, method, specPath, hasGlobalSecurity) {
  const { path: pathSegments, rawPath, variables } = toPostmanPath(specPath);
  const query = (operation.parameters || [])
    .filter((parameter) => parameter.in === 'query')
    .map((parameter) => ({ key: parameter.name, value: '', ...(parameter.description ? { description: parameter.description } : {}) }));

  const rawQuery = query.length
    ? `?${query.map((entry) => `${entry.key}=`).join('&')}`
    : '';
  const raw = `{{baseUrl}}${rawPath}${rawQuery}`;

  const header = [];
  const jsonBody = Boolean(
    operation.requestBody?.content?.['application/json'],
  );
  if (jsonBody) header.push({ key: 'Content-Type', value: 'application/json' });

  const secured = operation.security ? operation.security.length > 0 : hasGlobalSecurity;

  return {
    name: requestName(operation, method, specPath),
    request: {
      method: method.toUpperCase(),
      header,
      url: {
        raw,
        host: ['{{baseUrl}}'],
        path: pathSegments,
        ...(query.length ? { query } : {}),
        ...(variables.length
          ? { variable: variables.map((key) => ({ key, value: '', description: 'Path parameter' })) }
          : {}),
      },
      ...(jsonBody
        ? { body: { mode: 'raw', raw: '', options: { raw: { language: 'json' } } } }
        : {}),
      ...(secured
        ? { auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }] } }
        : { auth: { type: 'noauth' } }),
      description: operation.description || operation.summary || '',
    },
    response: [],
  };
}

function buildCollection(spec, baseUrl) {
  if (!spec || typeof spec.paths !== 'object') {
    throw new Error('The document has no `paths` object — it is not an OpenAPI document.');
  }
  // Global `security` applies to operations that do not declare their own.
  const hasGlobalSecurity = Array.isArray(spec.security) && spec.security.length > 0;
  const tagNames = new Map((spec.tags || []).map((tag) => [tag.name, tag.description || '']));
  const groups = new Map();

  for (const [specPath, pathItem] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      const tag = operation.tags?.[0] || specPath.replace(/^\/v1\/?/, '').split('/')[0] || 'default';
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag).push(buildRequest(operation, method, specPath, hasGlobalSecurity));
    }
  }

  const item = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, requests]) => ({
      name: tag,
      description: tagNames.get(tag) || '',
      item: requests.sort((a, b) => a.name.localeCompare(b.name)),
    }));

  return {
    info: {
      name: spec.info?.title ? `${spec.info.title} Collection` : 'VIORA API Collection',
      description: [
        `Generated from the OpenAPI ${spec.openapi || ''} document (version ${spec.info?.version || 'unknown'}).`,
        'Set the `baseUrl` collection variable and, for authenticated requests, `accessToken`.',
        'No secrets are embedded by this generator.',
      ].join('\n'),
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item,
    variable: [
      { key: 'baseUrl', value: baseUrl, type: 'string' },
      { key: 'accessToken', value: '', type: 'string' },
    ],
  };
}

async function main() {
  const spec = await loadSpec();
  const origin = apiOrigin() || 'https://evaka.test:4444';
  const baseUrl = `${origin}/v1`;
  const collection = buildCollection(spec, baseUrl);
  const totalRequests = collection.item.reduce((sum, group) => sum + group.item.length, 0);
  if (totalRequests === 0) throw new Error('The OpenAPI document contains no operations.');

  fs.writeFileSync(path.resolve(OUTPUT), `${JSON.stringify(collection, null, 2)}\n`);
  console.log(`POSTMAN_GENERATED=${OUTPUT}`);
  console.log(`POSTMAN_FOLDERS=${collection.item.length} POSTMAN_REQUESTS=${totalRequests}`);
  console.log(`POSTMAN_BASE_URL=${baseUrl}`);
}

main().catch((error) => {
  console.error(`POSTMAN_GENERATE=FAIL ${error.message}`);
  process.exit(1);
});
