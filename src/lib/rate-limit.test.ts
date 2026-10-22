import { describe, expect, it } from 'vitest';
import { RATE_LIMIT_PERIOD_SECONDS, rateLimit, type Limiter } from './rate-limit';
import { createWorkerHandler, type Next } from './worker';

const HOST = 'https://docs.example';

/** A limiter that allows `allowed` calls per key, then refuses, and records every key it was given. */
function fakeLimiter(allowed: number) {
  const keys: string[] = [];
  const counts = new Map<string, number>();
  const limiter: Limiter = {
    async limit({ key }) {
      keys.push(key);
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { success: count <= allowed };
    },
  };
  return { limiter, keys };
}

const reached: string[] = [];
const app: Next = async (request) => {
  reached.push(new URL(request.url).pathname);
  return new Response('ok');
};

function request(path: string, ip: string | null = '203.0.113.7', method = 'GET') {
  return new Request(`${HOST}${path}`, { method, headers: ip ? { 'CF-Connecting-IP': ip } : {} });
}

describe('the refusal', () => {
  it('answers a search over its limit with 429, Retry-After and the docs error shape', async () => {
    const { limiter } = fakeLimiter(0);
    const res = await createWorkerHandler({ app, limiters: { search: limiter } })(request('/api/docs/search?q=files'));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe(String(RATE_LIMIT_PERIOD_SECONDS));
    expect(res.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('rate_limited');
    expect(body.message).toContain(String(RATE_LIMIT_PERIOD_SECONDS));
  });

  it('answers /mcp over its limit with 429, Retry-After, a JSON-RPC error and CORS headers', async () => {
    const { limiter } = fakeLimiter(0);
    const res = await createWorkerHandler({ app, limiters: { mcp: limiter } })(request('/mcp', '203.0.113.7', 'POST'));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe(String(RATE_LIMIT_PERIOD_SECONDS));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Expose-Headers')).toContain('Retry-After');
    const body = (await res.json()) as { jsonrpc: string; id: null; error: { code: number; message: string } };
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBeNull();
    expect(typeof body.error.code).toBe('number');
    expect(body.error.message).toContain('Too many requests');
  });

  it('never reaches the router for a refused request', async () => {
    reached.length = 0;
    const { limiter } = fakeLimiter(0);
    await createWorkerHandler({ app, limiters: { search: limiter } })(request('/api/docs/search?q=files'));
    expect(reached).toEqual([]);
  });
});

describe('who is limited', () => {
  it('lets a client through until its limit, then refuses it, and keeps clients apart', async () => {
    const { limiter } = fakeLimiter(2);
    const handle = createWorkerHandler({ app, limiters: { search: limiter } });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await handle(request('/api/docs/search?q=a', '203.0.113.1'))).status);
    expect(statuses).toEqual([200, 200, 429, 429]);
    expect((await handle(request('/api/docs/search?q=a', '203.0.113.2'))).status).toBe(200);
  });

  it('keys the limit on the client address and nothing else, never the query', async () => {
    const { limiter, keys } = fakeLimiter(10);
    await createWorkerHandler({ app, limiters: { search: limiter } })(request('/api/docs/search?q=needle', '203.0.113.9'));
    expect(keys).toEqual(['203.0.113.9']);
  });

  it('uses the limiter of each address', async () => {
    const mcp = fakeLimiter(0);
    const search = fakeLimiter(10);
    const handle = createWorkerHandler({ app, limiters: { mcp: mcp.limiter, search: search.limiter } });
    expect((await handle(request('/mcp', '203.0.113.1', 'POST'))).status).toBe(429);
    expect((await handle(request('/api/docs/search?q=a'))).status).toBe(200);
  });

  it.each([
    '/api/docs/topics',
    '/api/search',
    '/files.md',
    '/llms.txt',
    '/llms-full.txt',
    '/docs-map.md',
    '/overview',
    '/version.json',
  ])('does not limit %s', async (path) => {
    const { limiter, keys } = fakeLimiter(0);
    const res = await createWorkerHandler({ app, limiters: { mcp: limiter, search: limiter } })(request(path));
    expect(res.status).toBe(200);
    expect(keys).toEqual([]);
  });

  it('does not count a CORS preflight', async () => {
    const { limiter, keys } = fakeLimiter(0);
    const res = await createWorkerHandler({ app, limiters: { mcp: limiter } })(request('/mcp', '203.0.113.1', 'OPTIONS'));
    expect(res.status).toBe(200);
    expect(keys).toEqual([]);
  });
});

describe('a limit that is not there', () => {
  it('is skipped when no limiter is bound, as in local development and tests', async () => {
    const handle = createWorkerHandler({ app });
    for (let i = 0; i < 5; i++) {
      expect((await handle(request('/api/docs/search?q=a'))).status).toBe(200);
      expect((await handle(request('/mcp', '203.0.113.1', 'POST'))).status).toBe(200);
    }
  });

  it('lets a request through when it has no client address', async () => {
    const { limiter, keys } = fakeLimiter(0);
    const res = await createWorkerHandler({ app, limiters: { search: limiter } })(request('/api/docs/search?q=a', null));
    expect(res.status).toBe(200);
    expect(keys).toEqual([]);
  });

  it('lets a request through when the limiter fails', async () => {
    const broken: Limiter = {
      async limit() {
        throw new Error('binding unavailable');
      },
    };
    const res = await createWorkerHandler({ app, limiters: { search: broken } })(request('/api/docs/search?q=a'));
    expect(res.status).toBe(200);
  });

  it('is the stage alone: rateLimit({}) passes everything on', async () => {
    const res = await rateLimit({})(request('/mcp'), app);
    expect(res.status).toBe(200);
  });
});
