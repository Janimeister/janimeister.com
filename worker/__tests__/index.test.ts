import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';

// Runs under Node's built-in TypeScript type stripping (`npm run test:node`).

const RSS = `<feed><entry>
  <yt:videoId>abc123</yt:videoId>
  <title>Malenia</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
  <published>2024-03-15T10:00:00+00:00</published>
</entry></feed>`;

const originalFetch = globalThis.fetch;
let store: Map<string, Response>;
let pending: Promise<unknown>[];

const ctx = {
  waitUntil: (p: Promise<unknown>) => void pending.push(p),
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

beforeEach(() => {
  store = new Map();
  pending = [];
  (globalThis as Record<string, unknown>).caches = {
    default: {
      match: async (req: Request) => store.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => void store.set(req.url, res),
    },
  };
  // Silence the expected "Feed fetch failed" log in error tests.
  mock.method(console, 'error', () => {});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restoreAll();
});

function request(path = '/', init: RequestInit & { origin?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.origin) headers.set('Origin', init.origin);
  return new Request(`https://feed.example${path}`, { ...init, headers });
}

const env = { ALLOWED_ORIGIN: 'https://janimeister.com' };

describe('worker', () => {
  test('serves the RSS feed as cacheable JSON with CORS for allowed origins', async () => {
    globalThis.fetch = mock.fn(async () => new Response(RSS));
    const res = await worker.fetch(request('/', { origin: 'https://janimeister.com' }), env, ctx);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=600, stale-while-revalidate=3600');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://janimeister.com');
    assert.equal(res.headers.get('Vary'), 'Origin');
    assert.equal(res.headers.get('X-Cache'), 'MISS');
    const body = await res.json();
    assert.equal(body.videos[0].id, 'abc123');
  });

  test('serves repeat requests from the edge cache', async () => {
    globalThis.fetch = mock.fn(async () => new Response(RSS));
    await worker.fetch(request('/', { origin: 'https://janimeister.com' }), env, ctx);
    await Promise.all(pending);

    const res = await worker.fetch(request('/', { origin: 'https://janimeister.com' }), env, ctx);
    assert.equal(res.headers.get('X-Cache'), 'HIT');
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=600, stale-while-revalidate=3600');
    assert.equal((globalThis.fetch as ReturnType<typeof mock.fn>).mock.callCount(), 1);
  });

  test('omits the CORS header for disallowed origins', async () => {
    globalThis.fetch = mock.fn(async () => new Response(RSS));
    const res = await worker.fetch(request('/', { origin: 'https://evil.example' }), env, ctx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
  });

  test('upstream failures return an uncacheable 502 without internal details', async () => {
    globalThis.fetch = mock.fn(async () => new Response('boom', { status: 500 }));
    const res = await worker.fetch(request('/', { origin: 'https://janimeister.com' }), env, ctx);

    assert.equal(res.status, 502);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://janimeister.com');
    assert.deepEqual(await res.json(), { error: 'fetch_failed', message: 'Upstream feed unavailable' });
    await Promise.all(pending);
    assert.equal(store.size, 0);
  });

  test('unknown paths return an uncacheable 404', async () => {
    const res = await worker.fetch(request('/nope'), env, ctx);
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
  });

  test('non-GET methods return an uncacheable 405', async () => {
    const res = await worker.fetch(request('/', { method: 'POST' }), env, ctx);
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(res.headers.get('Allow'), 'GET, OPTIONS');
  });

  test('answers CORS preflight requests', async () => {
    const res = await worker.fetch(request('/', { method: 'OPTIONS', origin: 'https://janimeister.com' }), env, ctx);
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://janimeister.com');
  });
});
