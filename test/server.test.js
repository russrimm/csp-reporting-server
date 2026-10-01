'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-reports-'));
const { createServer, parseReports } = require('../server.js');

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

test('parses Reporting API csp-violation reports', () => {
  const [r] = parseReports([
    {
      age: 10,
      type: 'csp-violation',
      url: 'https://app.example/page',
      user_agent: 'UA',
      body: {
        blockedURL: 'https://evil.example/x.js',
        documentURL: 'https://app.example/page',
        effectiveDirective: 'script-src-elem',
        disposition: 'enforce',
      },
    },
  ]);
  assert.equal(r.format, 'reporting-api');
  assert.equal(r.effectiveDirective, 'script-src-elem');
  assert.equal(r.blockedURL, 'https://evil.example/x.js');
});

test('parses legacy report-uri reports', () => {
  const [r] = parseReports(
    { 'csp-report': { 'document-uri': 'https://a/', 'blocked-uri': 'inline', 'violated-directive': 'script-src' } },
    'UA',
  );
  assert.equal(r.format, 'report-uri');
  assert.equal(r.effectiveDirective, 'script-src');
  assert.equal(r.userAgent, 'UA');
});

test('accepts application/reports+json and exposes it via the API', async () => {
  const res = await fetch(`${base}/reporting/my-app`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/reports+json', Origin: 'https://app.example' },
    body: JSON.stringify([
      { type: 'csp-violation', url: 'https://app.example/', body: { effectiveDirective: 'img-src' } },
    ]),
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://app.example');

  const data = await (await fetch(`${base}/api/reports?source=my-app`)).json();
  assert.equal(data.count, 1);
  assert.equal(data.reports[0].effectiveDirective, 'img-src');
});

test('accepts application/csp-report on /reporting and records the source', async () => {
  const res = await fetch(`${base}/reporting/legacy-app`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/csp-report' },
    body: JSON.stringify({ 'csp-report': { 'document-uri': 'https://a/', 'effective-directive': 'style-src-elem' } }),
  });
  assert.equal(res.status, 204);
  const data = await (await fetch(`${base}/api/reports?source=legacy-app`)).json();
  assert.equal(data.count, 1);
  assert.equal(data.reports[0].format, 'report-uri');
});

test('still accepts the legacy /reports and /csp-report paths', async () => {
  const to = await fetch(`${base}/reports/old-to`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/reports+json' },
    body: JSON.stringify([{ type: 'csp-violation', url: 'https://a/', body: { effectiveDirective: 'img-src' } }]),
  });
  assert.equal(to.status, 204);
  const uri = await fetch(`${base}/csp-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/csp-report' },
    body: JSON.stringify({ 'csp-report': { 'document-uri': 'https://a/', 'effective-directive': 'style-src-elem' } }),
  });
  assert.equal(uri.status, 204);
});

test('rejects nested names under /reporting', async () => {
  const res = await fetch(`${base}/reporting/team/my-app`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/reports+json' },
    body: '[]',
  });
  assert.equal(res.status, 404);
});

test('handles CORS preflight', async () => {
  const res = await fetch(`${base}/reporting`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://app.example', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(res.status, 204);
  assert.match(res.headers.get('access-control-allow-methods'), /POST/);
});

test('rejects unsupported content types and bad JSON', async () => {
  const bad = await fetch(`${base}/reporting`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' });
  assert.equal(bad.status, 415);
  const invalid = await fetch(`${base}/reporting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/reports+json' },
    body: '{nope',
  });
  assert.equal(invalid.status, 400);
});

test('test page sends CSP and Reporting-Endpoints headers', async () => {
  const res = await fetch(`${base}/test`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /report-to csp-endpoint/);
  assert.match(res.headers.get('content-security-policy'), /report-uri \/reporting\/test-page/);
  assert.match(res.headers.get('reporting-endpoints'), /csp-endpoint="http:\/\/.+\/reporting\/test-page"/);
});

test('test page honors X-Forwarded-Proto behind a TLS-terminating proxy', async () => {
  const res = await fetch(`${base}/test`, { headers: { 'X-Forwarded-Proto': 'https' } });
  assert.match(res.headers.get('reporting-endpoints'), /csp-endpoint="https:\/\/.+\/reporting\/test-page"/);
});

test('test page mode selects report-to or report-uri only', async () => {
  const uri = await fetch(`${base}/test?mode=report-uri`);
  assert.doesNotMatch(uri.headers.get('content-security-policy'), /report-to/);
  assert.equal(uri.headers.get('reporting-endpoints'), null);

  const to = await fetch(`${base}/test?mode=report-to`);
  assert.doesNotMatch(to.headers.get('content-security-policy'), /report-uri/);
  assert.ok(to.headers.get('reporting-endpoints'));
});

test('dashboard is served with a strict self-only CSP and its assets resolve', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const csp = res.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /style-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline/);
  for (const [asset, type] of [
    ['/styles.css', /text\/css/],
    ['/dashboard.js', /javascript/],
    ['/theme.js', /javascript/],
    ['/test.js', /javascript/],
    ['/favicon.svg', /svg/],
  ]) {
    const r = await fetch(`${base}${asset}`);
    assert.equal(r.status, 200, asset);
    assert.match(r.headers.get('content-type'), type, asset);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff', asset);
  }
});

test('clears reports', async () => {
  const res = await fetch(`${base}/api/reports`, { method: 'DELETE' });
  assert.equal(res.status, 200);
  const data = await (await fetch(`${base}/api/reports`)).json();
  assert.equal(data.count, 0);
});
