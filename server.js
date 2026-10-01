'use strict';

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const HTTPS_FLAG = process.argv.includes('--https');
const PORT = Number(process.env.PORT) || (HTTPS_FLAG ? 9443 : 9000);
// Undefined binds all interfaces (IPv4 + IPv6), so both 127.0.0.1 and ::1 "localhost" work.
const HOST = process.env.HOST || undefined;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'reports.ndjson');
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 1024 * 1024;
const MAX_REPORTS_IN_MEMORY = Number(process.env.MAX_REPORTS) || 5000;
const TLS_CERT = process.env.TLS_CERT || (HTTPS_FLAG ? path.join(__dirname, 'certs', 'localhost.pem') : undefined);
const TLS_KEY = process.env.TLS_KEY || (HTTPS_FLAG ? path.join(__dirname, 'certs', 'localhost-key.pem') : undefined);
const USE_TLS = Boolean(TLS_CERT && TLS_KEY);
const PUBLIC_DIR = path.join(__dirname, 'public');

const ACCEPTED_CONTENT_TYPES = new Set([
  'application/reports+json',
  'application/csp-report',
  'application/json',
]);

// First path segment of the ingestion endpoint. 'reporting' is current; the others are legacy aliases.
const INGEST_PREFIXES = new Set(['reporting', 'reports', 'csp-report']);

/** @type {object[]} */
let reports = [];
const sseClients = new Set();

function loadReports() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) return;
  const lines = fs.readFileSync(DATA_FILE, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      reports.push(JSON.parse(line));
    } catch {
      // Skip corrupt lines rather than failing startup.
    }
  }
  reports = reports.slice(-MAX_REPORTS_IN_MEMORY);
}

function storeReports(newReports) {
  if (newReports.length === 0) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(DATA_FILE, newReports.map((r) => JSON.stringify(r)).join('\n') + '\n');
  reports.push(...newReports);
  if (reports.length > MAX_REPORTS_IN_MEMORY) {
    reports = reports.slice(-MAX_REPORTS_IN_MEMORY);
  }
  for (const report of newReports) {
    broadcast('report', report);
  }
}

function clearReports() {
  reports = [];
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, '');
  broadcast('cleared', {});
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) res.write(payload);
}

/**
 * Converts a Reporting API report (application/reports+json) into a common shape.
 * https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API
 */
function normalizeReportingApiReport(raw) {
  const body = raw && typeof raw.body === 'object' && raw.body !== null ? raw.body : {};
  return {
    format: 'reporting-api',
    type: String(raw.type || 'unknown'),
    url: raw.url ?? body.documentURL ?? null,
    userAgent: raw.user_agent ?? null,
    age: raw.age ?? null,
    documentURL: body.documentURL ?? null,
    blockedURL: body.blockedURL ?? null,
    effectiveDirective: body.effectiveDirective ?? null,
    disposition: body.disposition ?? null,
    originalPolicy: body.originalPolicy ?? null,
    sourceFile: body.sourceFile ?? null,
    lineNumber: body.lineNumber ?? null,
    columnNumber: body.columnNumber ?? null,
    sample: body.sample ?? null,
    statusCode: body.statusCode ?? null,
    referrer: body.referrer ?? null,
    raw,
  };
}

/** Converts a legacy CSP report (application/csp-report, report-uri) into a common shape. */
function normalizeLegacyCspReport(raw, userAgent) {
  const r = raw['csp-report'] || {};
  return {
    format: 'report-uri',
    type: 'csp-violation',
    url: r['document-uri'] ?? null,
    userAgent: userAgent ?? null,
    age: null,
    documentURL: r['document-uri'] ?? null,
    blockedURL: r['blocked-uri'] ?? null,
    effectiveDirective: r['effective-directive'] ?? r['violated-directive'] ?? null,
    disposition: r.disposition ?? null,
    originalPolicy: r['original-policy'] ?? null,
    sourceFile: r['source-file'] ?? null,
    lineNumber: r['line-number'] ?? null,
    columnNumber: r['column-number'] ?? null,
    sample: r['script-sample'] ?? null,
    statusCode: r['status-code'] ?? null,
    referrer: r.referrer ?? null,
    raw,
  };
}

function parseReports(payload, userAgent) {
  const items = Array.isArray(payload) ? payload : [payload];
  const out = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    if (item['csp-report']) {
      out.push(normalizeLegacyCspReport(item, userAgent));
    } else if ('type' in item || 'body' in item) {
      out.push(normalizeReportingApiReport(item));
    }
  }
  return out;
}

function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!tooLarge) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

async function handleReportPost(req, res, source) {
  setCorsHeaders(req, res);
  const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!ACCEPTED_CONTENT_TYPES.has(contentType)) {
    return sendJson(res, 415, { error: `Unsupported Content-Type: ${contentType || '(none)'}` });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, err.status || 400, { error: err.status ? err.message : 'Invalid JSON' });
  }

  const receivedAt = new Date().toISOString();
  const remoteAddress = req.socket.remoteAddress;
  const parsed = parseReports(payload, req.headers['user-agent']).map((r) => ({
    id: crypto.randomUUID(),
    receivedAt,
    source,
    contentType,
    remoteAddress,
    ...r,
  }));

  storeReports(parsed);
  for (const r of parsed) {
    console.log(
      `[${receivedAt}] ${r.type} (${r.format}) source=${source} directive=${r.effectiveDirective} ` +
        `blocked=${r.blockedURL} doc=${r.documentURL}`,
    );
  }

  res.writeHead(204);
  res.end();
}

function serveStatic(res, file, contentType, extraHeaders = {}) {
  fs.readFile(path.join(PUBLIC_DIR, file), (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff', ...extraHeaders });
    res.end(data);
  });
}

function requestScheme(req) {
  // Behind a TLS-terminating proxy (e.g., Azure App Service) the original scheme arrives in X-Forwarded-Proto.
  const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  if (forwarded === 'https' || forwarded === 'http') return forwarded;
  return USE_TLS ? 'https' : 'http';
}

/**
 * mode: "report-to" (Reporting API), "report-uri" (legacy), or "both" (default).
 * Browsers that support report-to ignore report-uri when both are present.
 */
function testPageHeaders(req, mode) {
  const endpoint = `${requestScheme(req)}://${req.headers.host}/reporting/test-page`;
  const directives = ["default-src 'self'", "script-src 'self'", "img-src 'self'", "style-src 'self'"];
  if (mode !== 'report-to') directives.push('report-uri /reporting/test-page');
  if (mode !== 'report-uri') directives.push('report-to csp-endpoint');
  const headers = {
    'Content-Security-Policy': directives.join('; '),
    'Cache-Control': 'no-store',
  };
  if (mode !== 'report-uri') headers['Reporting-Endpoints'] = `csp-endpoint="${endpoint}"`;
  return headers;
}

// The dashboard follows the same strict, self-only policy it helps others enforce.
const DASHBOARD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const HTML_HEADERS = { 'Content-Security-Policy': DASHBOARD_CSP, 'Cache-Control': 'no-store' };

const STATIC_ROUTES = {
  '/': ['index.html', 'text/html; charset=utf-8', HTML_HEADERS],
  '/index.html': ['index.html', 'text/html; charset=utf-8', HTML_HEADERS],
  '/dashboard.js': ['dashboard.js', 'text/javascript; charset=utf-8'],
  '/test.js': ['test.js', 'text/javascript; charset=utf-8'],
  '/theme.js': ['theme.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
};

async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;
  const parts = pathname.split('/').filter(Boolean);

  try {
    // Report ingestion: /reporting[/:source] accepts either format. /reports and /csp-report
    // are kept as aliases so endpoints configured before /reporting keep working.
    if (INGEST_PREFIXES.has(parts[0]) && parts.length <= 2) {
      const source = parts[1] ? decodeURIComponent(parts[1]) : 'default';
      if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.writeHead(204);
        return res.end();
      }
      if (req.method === 'POST') return await handleReportPost(req, res, source);
      res.writeHead(405, { Allow: 'POST, OPTIONS' });
      return res.end();
    }

    if (pathname === '/api/reports' && req.method === 'GET') {
      const type = url.searchParams.get('type');
      const source = url.searchParams.get('source');
      const filtered = reports.filter(
        (r) => (!type || r.type === type) && (!source || r.source === source),
      );
      return sendJson(res, 200, { count: filtered.length, reports: filtered });
    }

    if (pathname === '/api/reports' && req.method === 'DELETE') {
      clearReports();
      return sendJson(res, 200, { cleared: true });
    }

    if (pathname === '/api/stream' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('retry: 3000\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (pathname === '/health') return sendJson(res, 200, { status: 'ok', reports: reports.length });

    if (req.method === 'GET' && pathname === '/test') {
      const mode = url.searchParams.get('mode') || 'both';
      return serveStatic(res, 'test.html', 'text/html; charset=utf-8', testPageHeaders(req, mode));
    }

    if (req.method === 'GET' && STATIC_ROUTES[pathname]) {
      const [file, type, headers] = STATIC_ROUTES[pathname];
      return serveStatic(res, file, type, headers);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
    else res.end();
  }
}

function createServer() {
  return USE_TLS
    ? https.createServer({ cert: fs.readFileSync(TLS_CERT), key: fs.readFileSync(TLS_KEY) }, handler)
    : http.createServer(handler);
}

function start() {
  loadReports();
  const server = createServer();

  // Keep SSE connections alive through proxies.
  setInterval(() => {
    for (const res of sseClients) res.write(': ping\n\n');
  }, 25000).unref();

  server.listen(PORT, HOST, () => {
    const base = `${USE_TLS ? 'https' : 'http'}://localhost:${server.address().port}`;
    console.log(`CSP reporting server listening on ${base}`);
    console.log(`  Dashboard:          ${base}/`);
    console.log(`  Test page:          ${base}/test`);
    console.log(`  Report endpoint:    ${base}/reporting/<app-name> (report-to and report-uri)`);
    console.log(`  Loaded ${reports.length} stored report(s) from ${DATA_FILE}`);
  });
  return server;
}

if (require.main === module) start();

module.exports = { parseReports, createServer, start };
