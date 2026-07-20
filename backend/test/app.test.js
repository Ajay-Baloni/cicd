import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

// These tests deliberately need no database. They cover the behaviour that
// must hold even when Postgres is down — which is exactly the behaviour a
// deploy health check depends on. Database-backed tests arrive in Phase 2,
// running against a real Postgres service container in CI.

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /health returns 200 even with no database', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.uptime, 'number');
});

test('GET /health sets a request id header for tracing', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.ok(res.headers.get('x-request-id'), 'expected an x-request-id header');
});

test('unknown routes return a JSON 404', async () => {
  const res = await fetch(`${baseUrl}/definitely-not-a-route`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not Found' });
});

test('POST /api/notes rejects an empty title with 400', async () => {
  const res = await fetch(`${baseUrl}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '', body: 'no title' }),
  });

  // Validation must fail before any database call, so this is a 400 rather
  // than a 500 despite there being no database in this test run.
  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, 'Validation failed');
  assert.ok(Array.isArray(body.details));
});
