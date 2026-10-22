import { describe, expect, it } from 'vitest';
import { AGENT_READ_EVENT, CAPTURE_URL, agentReads, clientClass, hitsIn, mcpFacts, type AgentReadEvent } from './agent-reads';
import { handleDocsSearch } from './docs-api';
import { createDocsServer } from './mcp/tools';
import { DOCS_TOOL_NAMES } from './mcp/tools';
import { handleMcpRequest } from './mcp/server';
import type { Limiter } from './rate-limit';
import { createWorkerHandler, type Next } from './worker';

const HOST = 'https://docs.example';
const KEY = 'phc_test_key';

type Sent = { url: string; init: RequestInit; event: AgentReadEvent };

/** A stand-in for PostHog: records every request and answers like the capture endpoint. */
function fakeCapture(options: { fail?: 'reject' | 'status' | 'hang' } = {}) {
  const sent: Sent[] = [];
  const pending: Promise<unknown>[] = [];
  const send = (async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {}, event: JSON.parse(String(init?.body)) });
    if (options.fail === 'reject') throw new TypeError('network down');
    if (options.fail === 'status') return new Response('nope', { status: 500 });
    return new Response('{"status":"Ok"}');
  }) as typeof fetch;
  return { sent, pending, send, waitUntil: (p: Promise<unknown>) => void pending.push(p), settled: () => Promise.all(pending) };
}

/** The router's answers for the addresses these tests ask for. */
const app: Next = async (request) => {
  const { pathname } = new URL(request.url);
  if (pathname === '/mcp') return handleMcpRequest(request);
  if (pathname === '/api/docs/search') return handleDocsSearch(request);
  if (pathname === '/api/docs/topics') return Response.json({ pages: [] });
  if (pathname.startsWith('/api/docs/')) return Response.json({ error: 'not_found' }, { status: 404 });
  if (pathname === '/llms.txt' || pathname === '/llms-full.txt') return new Response('index');
  if (pathname === '/docs-map.md') return new Response('map', { headers: { 'Content-Type': 'text/markdown' } });
  if (pathname.endsWith('.md')) return new Response('# page', { headers: { 'Content-Type': 'text/markdown' } });
  return new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } });
};

function handlerWith(capture: ReturnType<typeof fakeCapture>, key = KEY) {
  return createWorkerHandler({ app, analytics: { key, fetch: capture.send, waitUntil: capture.waitUntil } });
}

function get(path: string, headers: Record<string, string> = {}, method = 'GET') {
  return new Request(`${HOST}${path}`, { method, headers });
}

function mcpPost(message: object, headers: Record<string, string> = {}) {
  return new Request(`${HOST}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify(message),
  });
}

// The only properties an event may carry. A new one is a decision about what
// the site learns about its readers, so it fails here until it is added on purpose.
const ALLOWED = new Set([
  '$process_person_profile',
  '$geoip_disable',
  'site',
  'surface',
  'method',
  'status',
  'client',
  'path',
  'via',
  'mcp_method',
  'mcp_tool',
  'hits',
]);

describe('the event for each agent address', () => {
  it.each([
    ['/mcp', 'mcp'],
    ['/api/docs/search?q=files', 'search'],
    ['/api/docs/topics', 'topics'],
    ['/api/docs/other', 'api_other'],
    ['/llms.txt', 'llms_txt'],
    ['/llms-full.txt', 'llms_full_txt'],
    ['/docs-map.md', 'docs_map'],
    ['/files.md', 'markdown'],
  ])('sends one event for %s with the surface %s', async (path, surface) => {
    const capture = fakeCapture();
    await handlerWith(capture)(get(path));
    await capture.settled();
    expect(capture.sent).toHaveLength(1);
    expect(capture.sent[0].url).toBe(CAPTURE_URL);
    expect(capture.sent[0].event.event).toBe(AGENT_READ_EVENT);
    expect(capture.sent[0].event.properties.surface).toBe(surface);
  });

  it('posts JSON to the EU capture address with the project key', async () => {
    const capture = fakeCapture();
    await handlerWith(capture)(get('/llms.txt'));
    await capture.settled();
    expect(CAPTURE_URL).toBe('https://eu.i.posthog.com/i/v0/e/');
    expect(capture.sent[0].init.method).toBe('POST');
    expect(new Headers(capture.sent[0].init.headers).get('Content-Type')).toBe('application/json');
    expect(capture.sent[0].event.api_key).toBe(KEY);
  });

  it('records the page path of a Markdown copy, and the status and method', async () => {
    const capture = fakeCapture();
    await handlerWith(capture)(get('/files.md', { 'User-Agent': 'codex_cli_rs/0.1' }));
    await capture.settled();
    expect(capture.sent[0].event.properties).toEqual({
      $process_person_profile: false,
      $geoip_disable: true,
      site: 'docs',
      surface: 'markdown',
      method: 'GET',
      status: 200,
      client: 'codex',
      path: '/files',
      via: 'path',
    });
  });

  it('counts a page address that answered Markdown by Accept, and not one that answered HTML', async () => {
    const capture = fakeCapture();
    const negotiated: Next = async (request) =>
      new Response('# page', {
        headers: { 'Content-Type': request.headers.get('Accept') === 'text/markdown' ? 'text/markdown' : 'text/html' },
      });
    const handle = createWorkerHandler({ app: negotiated, analytics: { key: KEY, fetch: capture.send, waitUntil: capture.waitUntil } });
    await handle(get('/overview', { Accept: 'text/markdown' }));
    await handle(get('/overview', { Accept: 'text/html' }));
    await capture.settled();
    expect(capture.sent).toHaveLength(1);
    expect(capture.sent[0].event.properties).toMatchObject({ surface: 'markdown', via: 'accept', path: '/overview' });
  });

  it('leaves out the path of a Markdown copy that is no page, so a typed address is not kept', async () => {
    const capture = fakeCapture();
    const missing: Next = async () => new Response('No such page.\n', { status: 404 });
    await createWorkerHandler({ app: missing, analytics: { key: KEY, fetch: capture.send, waitUntil: capture.waitUntil } })(
      get('/my-secret-question.md'),
    );
    await capture.settled();
    expect(capture.sent[0].event.properties).toMatchObject({ surface: 'markdown', status: 404 });
    expect(capture.sent[0].event.properties).not.toHaveProperty('path');
    expect(JSON.stringify(capture.sent[0].event)).not.toContain('secret');
  });

  it('sends nothing for a page that a browser reads, an OPTIONS preflight or an unrelated address', async () => {
    const capture = fakeCapture();
    const handle = handlerWith(capture);
    await handle(get('/overview', { Accept: 'text/html' }));
    await handle(get('/version.json'));
    await handle(get('/mcp', {}, 'OPTIONS'));
    await capture.settled();
    expect(capture.sent).toEqual([]);
  });
});

describe('an MCP request', () => {
  it('names tools/call and the tool, and the client from clientInfo as a class', async () => {
    const capture = fakeCapture();
    await handlerWith(capture)(
      mcpPost({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'docs_fetch',
          arguments: { path: '/files' },
          _meta: { 'io.modelcontextprotocol/clientInfo': { name: 'claude-code', version: '9.9.9' } },
        },
      }),
    );
    await capture.settled();
    expect(capture.sent[0].event.properties).toMatchObject({
      surface: 'mcp',
      mcp_method: 'tools/call',
      mcp_tool: 'docs_fetch',
      client: 'claude-code',
      method: 'POST',
      path: '/mcp',
    });
  });

  it('counts tools/list and initialize as their own kinds, with no tool', async () => {
    const capture = fakeCapture();
    const handle = handlerWith(capture);
    await handle(mcpPost({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    await handle(
      mcpPost({
        jsonrpc: '2.0',
        id: 2,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'codex-mcp-client', version: '1' } },
      }),
    );
    await capture.settled();
    expect(capture.sent.map((s) => s.event.properties.mcp_method)).toEqual(['tools/list', 'initialize']);
    expect(capture.sent.every((s) => !('mcp_tool' in s.event.properties))).toBe(true);
    expect(capture.sent[1].event.properties.client).toBe('codex');
  });

  it('counts the hits of a docs_search call, never the query', async () => {
    const capture = fakeCapture();
    const response = await handlerWith(capture)(
      mcpPost({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'docs_search', arguments: { query: 'private housekeeping question', limit: 2 } },
      }),
    );
    await capture.settled();
    expect(response.status).toBe(200);
    expect(capture.sent[0].event.properties).toMatchObject({ mcp_tool: 'docs_search', hits: expect.any(Number) });
    expect(JSON.stringify(capture.sent[0].event)).not.toContain('private');
  });

  it('still answers the client the whole result when the count reads the body too', async () => {
    const capture = fakeCapture();
    const response = await handlerWith(capture)(
      mcpPost({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'docs_search', arguments: { query: 'files' } } }),
    );
    expect(await response.text()).toContain('"hits"');
  });

  it.each([
    ['a tool the server does not have', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'my own tool name' } }, 'other'],
  ])('replaces %s with other, so a client cannot write into the event', async (_label, message, tool) => {
    const capture = fakeCapture();
    await handlerWith(capture)(mcpPost(message));
    await capture.settled();
    expect(capture.sent[0].event.properties.mcp_tool).toBe(tool);
    expect(JSON.stringify(capture.sent[0].event)).not.toContain('my own tool');
  });

  it('survives a body that is not JSON', async () => {
    const capture = fakeCapture();
    const response = await handlerWith(capture)(
      new Request(`${HOST}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: '{not json' }),
    );
    await capture.settled();
    expect(response.status).toBe(400);
    expect(capture.sent[0].event.properties).toMatchObject({ mcp_method: 'other', status: 400 });
  });

  it('does not read a body past its bound', async () => {
    const capture = fakeCapture();
    const big = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', padding: 'x'.repeat(70_000) });
    await handlerWith(capture)(
      new Request(`${HOST}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: big }),
    );
    await capture.settled();
    expect(capture.sent[0].event.properties.mcp_method).toBe('other');
  });
});

describe('a search', () => {
  it('carries the number of hits and not the query', async () => {
    const capture = fakeCapture();
    const response = await handlerWith(capture)(get('/api/docs/search?q=housekeeping%20secretword&limit=3'));
    await capture.settled();
    const body = (await response.json()) as { hits: unknown[] };
    expect(capture.sent[0].event.properties).toMatchObject({ surface: 'search', status: 200, hits: body.hits.length });
    expect(JSON.stringify(capture.sent[0].event)).not.toContain('secretword');
  });

  it('counts a refused search with its status and no hits', async () => {
    const capture = fakeCapture();
    await handlerWith(capture)(get('/api/docs/search'));
    await capture.settled();
    expect(capture.sent[0].event.properties).toMatchObject({ surface: 'search', status: 400 });
    expect(capture.sent[0].event.properties).not.toHaveProperty('hits');
  });
});

describe('what an event never holds', () => {
  const identifying = {
    'CF-Connecting-IP': '203.0.113.77',
    'X-Forwarded-For': '203.0.113.78',
    'User-Agent': 'Mozilla/5.0 (X11) SecretBrowser/1.2.3 claude-code/2.0',
    Cookie: 'session=abc123',
    Authorization: 'Bearer secret-token',
    Referer: 'https://elsewhere.example/private',
    Accept: 'text/markdown',
  };

  it.each(['/files.md', '/llms.txt', '/api/docs/search?q=needle', '/api/docs/topics', '/mcp'])(
    'sends only allowed properties for %s and none of the request',
    async (path) => {
      const capture = fakeCapture();
      await handlerWith(capture)(get(path, identifying));
      await capture.settled();
      const body = String(capture.sent[0].init.body);
      for (const forbidden of ['203.0.113', 'SecretBrowser', 'Mozilla', 'abc123', 'secret-token', 'elsewhere.example', 'needle']) {
        expect(body).not.toContain(forbidden);
      }
      expect(Object.keys(capture.sent[0].event.properties).filter((name) => !ALLOWED.has(name))).toEqual([]);
      expect(Object.keys(capture.sent[0].event).sort()).toEqual(['api_key', 'distinct_id', 'event', 'properties']);
      // Nothing the request carried goes out as a header either.
      expect(Object.keys(capture.sent[0].init.headers as object)).toEqual(['Content-Type']);
    },
  );

  it('creates no person profile and no GeoIP lookup', async () => {
    const capture = fakeCapture();
    await handlerWith(capture)(get('/llms.txt'));
    await capture.settled();
    expect(capture.sent[0].event.properties.$process_person_profile).toBe(false);
    expect(capture.sent[0].event.properties.$geoip_disable).toBe(true);
  });

  it('gives each event its own random id, so no two events join up', async () => {
    const capture = fakeCapture();
    const handle = handlerWith(capture);
    await handle(get('/llms.txt', { 'CF-Connecting-IP': '203.0.113.77' }));
    await handle(get('/llms.txt', { 'CF-Connecting-IP': '203.0.113.77' }));
    await capture.settled();
    const [first, second] = capture.sent.map((s) => s.event.distinct_id);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(first).not.toBe(second);
  });
});

describe('a build without the key, or a PostHog that fails', () => {
  it('sends nothing when the key is empty', async () => {
    const capture = fakeCapture();
    const response = await handlerWith(capture, '')(get('/llms.txt'));
    await capture.settled();
    expect(capture.sent).toEqual([]);
    expect(await response.text()).toBe('index');
  });

  it('sends nothing when the analytics option is left out, as in a test or local run', async () => {
    const capture = fakeCapture();
    const response = await createWorkerHandler({ app })(get('/llms.txt'));
    await capture.settled();
    expect(capture.sent).toEqual([]);
    expect(response.status).toBe(200);
  });

  it.each(['reject', 'status'] as const)('answers the same response when the send fails by %s', async (fail) => {
    const failing = fakeCapture({ fail });
    const quiet = fakeCapture();
    const withFailure = await handlerWith(failing)(get('/api/docs/search?q=files'));
    const without = await createWorkerHandler({ app })(get('/api/docs/search?q=files'));
    await failing.settled();
    expect(failing.sent).toHaveLength(1);
    expect(withFailure.status).toBe(without.status);
    expect(await withFailure.text()).toBe(await without.text());
    void quiet;
  });

  it('answers before the send finishes, and does not wait for it', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const pending: Promise<unknown>[] = [];
    const slow = (async () => {
      await gate;
      return new Response('{}');
    }) as typeof fetch;
    const response = await createWorkerHandler({
      app,
      analytics: { key: KEY, fetch: slow, waitUntil: (p: Promise<unknown>) => void pending.push(p) },
    })(get('/llms.txt'));
    expect(await response.text()).toBe('index');
    release();
    await Promise.all(pending);
  });

  it('answers when waitUntil itself throws', async () => {
    const response = await createWorkerHandler({
      app,
      analytics: {
        key: KEY,
        fetch: fakeCapture().send,
        waitUntil: () => {
          throw new Error('no context');
        },
      },
    })(get('/llms.txt'));
    expect(response.status).toBe(200);
  });

  it('does not touch the response body a client reads', async () => {
    const capture = fakeCapture();
    const plain = await createWorkerHandler({ app })(get('/api/docs/search?q=files'));
    const counted = await handlerWith(capture)(get('/api/docs/search?q=files'));
    expect(await counted.text()).toBe(await plain.text());
    expect([...counted.headers]).toEqual([...plain.headers]);
  });
});

describe('the client class', () => {
  it.each([
    ['marfa/0.0.25', 'marfa-cli'],
    ['claude-cli/2.1.0 (external, cli)', 'claude-code'],
    ['claude-code/1.0', 'claude-code'],
    ['Claude-User', 'claude'],
    ['ClaudeBot/1.0', 'claude'],
    ['codex_cli_rs/0.40', 'codex'],
    ['Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140 Safari/537.36', 'browser'],
    ['Mozilla/5.0 AppleWebKit/537.36; compatible; ChatGPT-User/1.0', 'chatgpt'],
    ['curl/8.7.1', 'script'],
    ['node', 'script'],
    ['python-requests/2.32', 'script'],
    ['SomethingElse/1', 'other'],
    ['', 'other'],
    [null, 'other'],
  ])('reduces %j to %s', (userAgent, expected) => {
    expect(clientClass(userAgent)).toBe(expected);
  });

  it('never lets the raw string through', () => {
    expect(clientClass('claude-code/2.0 internal-build-1234')).toBe('claude-code');
  });
});

describe('the MCP facts and hits readers', () => {
  it('reads the method of a message and the tool only from the server\'s own names', () => {
    expect(mcpFacts('{"jsonrpc":"2.0","method":"tools/call","params":{"name":"docs_search"}}')).toEqual({ method: 'tools/call', tool: 'docs_search' });
    expect(mcpFacts('{"jsonrpc":"2.0","method":"resources/list"}')).toEqual({ method: 'other' });
    expect(mcpFacts('[{"jsonrpc":"2.0","method":"tools/list"}]')).toEqual({ method: 'other' });
    expect(mcpFacts(null)).toEqual({ method: 'other' });
  });

  it('names exactly the tools the server registers, so the list cannot drift', async () => {
    const response = await handleMcpRequest(mcpPost({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    const text = await response.text();
    const data = text.split('\n').find((line) => line.startsWith('data:'));
    const body = JSON.parse(data ? data.slice(5) : text) as { result: { tools: { name: string }[] } };
    expect(body.result.tools.map((tool) => tool.name)).toEqual([...DOCS_TOOL_NAMES]);
    expect(createDocsServer()).toBeDefined();
  });

  it('counts hits in a search body and in an MCP event stream, and nothing else', () => {
    expect(hitsIn('{"hits":[{},{}]}', false)).toBe(2);
    expect(hitsIn('event: message\ndata: {"result":{"structuredContent":{"hits":[{}]}}}\n\n', true)).toBe(1);
    expect(hitsIn('{"result":{"structuredContent":{"hits":[{},{},{}]}}}', true)).toBe(3);
    expect(hitsIn('not json', false)).toBeUndefined();
    expect(hitsIn('{"error":"x"}', false)).toBeUndefined();
  });
});

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

const ADDRESS = { 'CF-Connecting-IP': '203.0.113.7' };

describe('a refused request', () => {
  it.each([
    ['/api/docs/search?q=files', 'search'],
    ['/mcp', 'mcp'],
  ])('sends no event for %s when the rate limit answers 429', async (path, name) => {
    const capture = fakeCapture();
    const refuse = fakeLimiter(0).limiter;
    const handle = createWorkerHandler({
      app,
      limiters: { [name]: refuse },
      analytics: { key: KEY, fetch: capture.send, waitUntil: capture.waitUntil },
    });
    const response = await handle(path === '/mcp' ? mcpPost({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, ADDRESS) : get(path, ADDRESS));
    await capture.settled();
    expect(response.status).toBe(429);
    expect(capture.sent).toEqual([]);
  });

  it('still counts a request the router refuses for another reason', async () => {
    const capture = fakeCapture();
    await handlerWith(capture)(get('/api/docs/search'));
    await capture.settled();
    expect(capture.sent[0].event.properties).toMatchObject({ status: 400 });
  });
});

describe('the limit on counting', () => {
  function counting(limiter: Limiter | undefined, capture: ReturnType<typeof fakeCapture>) {
    return createWorkerHandler({ app, analytics: { key: KEY, fetch: capture.send, waitUntil: capture.waitUntil, limiter } });
  }

  it('sends events until an address passes its limit, then serves the request and sends none', async () => {
    const capture = fakeCapture();
    const { limiter } = fakeLimiter(2);
    const handle = counting(limiter, capture);
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await handle(get('/llms.txt', ADDRESS))).status);
    await capture.settled();
    expect(statuses).toEqual([200, 200, 200, 200]);
    expect(capture.sent).toHaveLength(2);
  });

  it('keeps addresses apart, so one flooding address cannot silence another', async () => {
    const capture = fakeCapture();
    const handle = counting(fakeLimiter(1).limiter, capture);
    await handle(get('/llms.txt', { 'CF-Connecting-IP': '203.0.113.1' }));
    await handle(get('/llms.txt', { 'CF-Connecting-IP': '203.0.113.1' }));
    await handle(get('/llms.txt', { 'CF-Connecting-IP': '203.0.113.2' }));
    await capture.settled();
    expect(capture.sent).toHaveLength(2);
  });

  it.each(['/files.md', '/llms.txt', '/llms-full.txt', '/docs-map.md', '/api/docs/topics', '/api/docs/search?q=files', '/mcp'])(
    'covers %s',
    async (path) => {
      const capture = fakeCapture();
      const { limiter, keys } = fakeLimiter(0);
      const response = await counting(limiter, capture)(get(path, ADDRESS));
      await capture.settled();
      expect(response.status).toBe(path === '/mcp' ? 405 : 200);
      expect(keys).toEqual(['203.0.113.7']);
      expect(capture.sent).toEqual([]);
    },
  );

  it('keys the limit on the address alone, and puts it in no event', async () => {
    const capture = fakeCapture();
    const { limiter, keys } = fakeLimiter(5);
    await counting(limiter, capture)(get('/api/docs/search?q=needle', { ...ADDRESS, 'User-Agent': 'curl/8' }));
    await capture.settled();
    expect(keys).toEqual(['203.0.113.7']);
    expect(String(capture.sent[0].init.body)).not.toContain('203.0.113');
  });

  it('sends nothing when the limiter fails or the request has no address, since nothing then bounds the count', async () => {
    const broken: Limiter = {
      async limit() {
        throw new Error('binding unavailable');
      },
    };
    const capture = fakeCapture();
    expect((await counting(broken, capture)(get('/llms.txt', ADDRESS))).status).toBe(200);
    expect((await counting(fakeLimiter(5).limiter, capture)(get('/llms.txt'))).status).toBe(200);
    await capture.settled();
    expect(capture.sent).toEqual([]);
  });

  it('counts freely where no limiter is bound, as in a test or a local run', async () => {
    const capture = fakeCapture();
    await counting(undefined, capture)(get('/llms.txt'));
    await capture.settled();
    expect(capture.sent).toHaveLength(1);
  });

  it('does not wait for the limiter to answer the client', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow: Limiter = {
      async limit() {
        await gate;
        return { success: true };
      },
    };
    const capture = fakeCapture();
    const response = await counting(slow, capture)(get('/llms.txt', ADDRESS));
    expect(await response.text()).toBe('index');
    release();
    await capture.settled();
    expect(capture.sent).toHaveLength(1);
  });

  it('never counts, or limits for counting, the site search box', async () => {
    const capture = fakeCapture();
    const { limiter, keys } = fakeLimiter(5);
    const response = await counting(limiter, capture)(get('/api/search?query=files', ADDRESS));
    await capture.settled();
    expect(response.status).toBe(200);
    expect(keys).toEqual([]);
    expect(capture.sent).toEqual([]);
  });
});

describe('the response copy the count reads', () => {
  /** A response whose clone records whether its body was cancelled. */
  function withWatchedClone(body: string, init?: ResponseInit) {
    const state = { cancelled: false };
    const original = new Response(body, init);
    original.clone = () => {
      const copy = new Response(body, init);
      const stream = copy.body as ReadableStream;
      const cancel = stream.cancel.bind(stream);
      stream.cancel = (reason) => {
        state.cancelled = true;
        return cancel(reason);
      };
      return copy;
    };
    return { original, state };
  }

  function mcpCall(name: string) {
    return mcpPost({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name } });
  }

  async function run(request: Request, response: Response, limiter?: Limiter) {
    const capture = fakeCapture();
    const handle = createWorkerHandler({
      app: async () => response,
      analytics: { key: KEY, fetch: capture.send, waitUntil: capture.waitUntil, limiter },
    });
    await handle(request);
    await capture.settled();
    return capture;
  }

  it.each(['docs_fetch', 'docs_list_topics'])('is cancelled for an MCP call to %s, which reads no hits', async (tool) => {
    const { original, state } = withWatchedClone('data: {}');
    const capture = await run(mcpCall(tool), original);
    expect(state.cancelled).toBe(true);
    expect(capture.sent).toHaveLength(1);
  });

  it('is cancelled for tools/list and for a body that is not JSON', async () => {
    const list = withWatchedClone('data: {}');
    await run(mcpPost({ jsonrpc: '2.0', id: 1, method: 'tools/list' }), list.original);
    const junk = withWatchedClone('data: {}');
    await run(new Request(`${HOST}/mcp`, { method: 'POST', body: '{nope' }), junk.original);
    expect(list.state.cancelled).toBe(true);
    expect(junk.state.cancelled).toBe(true);
  });

  it('is read, not cancelled, for docs_search and for a JSON search', async () => {
    const tool = withWatchedClone('data: {"result":{"structuredContent":{"hits":[{}]}}}');
    const first = await run(mcpCall('docs_search'), tool.original);
    expect(tool.state.cancelled).toBe(false);
    expect(first.sent[0].event.properties.hits).toBe(1);

    const json = withWatchedClone('{"hits":[{},{}]}');
    const second = await run(get('/api/docs/search?q=files'), json.original);
    expect(json.state.cancelled).toBe(false);
    expect(second.sent[0].event.properties.hits).toBe(2);
  });

  it('is cancelled when the count limit refuses the event, even for a search', async () => {
    const { original, state } = withWatchedClone('{"hits":[{}]}');
    const capture = await run(get('/api/docs/search?q=files', ADDRESS), original, fakeLimiter(0).limiter);
    expect(state.cancelled).toBe(true);
    expect(capture.sent).toEqual([]);
  });
});

describe('the method of an event', () => {
  it.each(['GET', 'HEAD', 'POST', 'DELETE'])('keeps %s', async (method) => {
    const capture = fakeCapture();
    await handlerWith(capture)(new Request(`${HOST}/llms.txt`, { method }));
    await capture.settled();
    expect(capture.sent[0].event.properties.method).toBe(method);
  });

  it.each(['PUT', 'PATCH', 'PROPFIND'])('reports %s as other, so a client never names a value', async (method) => {
    const capture = fakeCapture();
    await handlerWith(capture)(new Request(`${HOST}/llms.txt`, { method }));
    await capture.settled();
    expect(capture.sent[0].event.properties.method).toBe('other');
  });
});
