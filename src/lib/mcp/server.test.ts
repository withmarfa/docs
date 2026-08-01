/**
 * Conformance tests for the docs MCP HTTP endpoint.
 *
 * These assert against the specification rather than against whatever the
 * current clients happen to tolerate. That distinction is the point: every
 * defect this file guards against shipped and survived because the clients in
 * use were forgiving, and one that was not could not connect at all.
 *
 * Each block names the rule it enforces so a failure says which rule broke.
 */

import { describe, expect, it } from 'vitest';
import { handleMcpRequest } from './server';

const ENDPOINT = 'https://docs.example/mcp';

/** The revision every client in practical use still opens with. */
const LEGACY_VERSION = '2025-06-18';
/** The current revision, per-request metadata and no handshake. */
const MODERN_VERSION = '2026-07-28';

type JsonRpc = Record<string, unknown>;

function legacyPost(body: JsonRpc | JsonRpc[]): Request {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });
}

/** The full per-request envelope the modern revision requires on every request. */
const MODERN_META = {
  'io.modelcontextprotocol/protocolVersion': MODERN_VERSION,
  'io.modelcontextprotocol/clientInfo': { name: 'conformance', version: '0.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};

function modernPost(
  method: string,
  params: JsonRpc = {},
  id: number | null = 1,
  extra: Record<string, string> = {},
): Request {
  const body: JsonRpc = {
    jsonrpc: '2.0',
    method,
    params: { ...params, _meta: MODERN_META },
    ...(id === null ? {} : { id }),
  };
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': MODERN_VERSION,
      'Mcp-Method': method,
      ...extra,
    },
    body: JSON.stringify(body),
  });
}

/** Read a response body as JSON, tolerating the SSE framing the SDK may pick. */
async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (res.headers.get('content-type')?.includes('text/event-stream')) {
    const line = text.split('\n').find((l) => l.startsWith('data:'));
    return line ? JSON.parse(line.slice(5).trim()) : null;
  }
  return text.length > 0 ? JSON.parse(text) : null;
}

async function initialize(version = LEGACY_VERSION): Promise<Response> {
  return handleMcpRequest(
    legacyPost({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: version,
        capabilities: {},
        clientInfo: { name: 'conformance', version: '0.0.0' },
      },
    }),
  );
}

describe('notifications draw no response body', () => {
  // Streamable HTTP, every revision that defines it: "If the server accepts the
  // input, the server MUST return HTTP status code 202 Accepted with no body."
  it('answers notifications/initialized with 202 and an empty body', async () => {
    const res = await handleMcpRequest(legacyPost({ jsonrpc: '2.0', method: 'notifications/initialized' }));
    expect(res.status).toBe(202);
    expect(await res.text()).toBe('');
  });

  it('accepts an unrecognized notification silently rather than answering -32601', async () => {
    const res = await handleMcpRequest(
      legacyPost({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1 } }),
    );
    expect(res.status).toBe(202);
    const body = await res.text();
    expect(body).toBe('');
    expect(body).not.toContain('-32601');
  });

  it('never emits a response envelope carrying a null id', async () => {
    for (const method of ['notifications/initialized', 'notifications/cancelled', 'notifications/unknown/thing']) {
      const res = await handleMcpRequest(legacyPost({ jsonrpc: '2.0', method }));
      const body = await res.text();
      expect(body, `${method} produced a body`).toBe('');
    }
  });
});

describe('protocol version is negotiated, not pinned', () => {
  it('echoes a supported requested version rather than a fixed one', async () => {
    const res = await initialize(LEGACY_VERSION);
    const body = (await readJson(res)) as { result?: { protocolVersion?: string } };
    expect(body.result?.protocolVersion).toBe(LEGACY_VERSION);
  });

  it('never advertises 2024-11-05, whose transport this server does not implement', async () => {
    for (const requested of ['2025-11-25', '2025-06-18']) {
      const res = await initialize(requested);
      const body = (await readJson(res)) as { result?: { protocolVersion?: string } };
      expect(body.result?.protocolVersion, `requested ${requested}`).not.toBe('2024-11-05');
      expect(body.result?.protocolVersion, `requested ${requested}`).toBe(requested);
    }
  });
});

describe('methods this endpoint does not offer', () => {
  // 2026-07-28, Backward Compatibility: a server that does not offer the 2025
  // session mechanisms should answer "HTTP GET or DELETE to the MCP endpoint"
  // with 405 Method Not Allowed.
  it('answers GET with 405 rather than a capability document', async () => {
    const res = await handleMcpRequest(new Request(ENDPOINT, { method: 'GET' }));
    expect(res.status).toBe(405);
    expect(res.headers.get('content-type') ?? '').not.toContain('text/event-stream');
  });

  it('answers DELETE with 405', async () => {
    const res = await handleMcpRequest(new Request(ENDPOINT, { method: 'DELETE' }));
    expect(res.status).toBe(405);
  });
});

describe('the modern revision is served', () => {
  // 2026-07-28: servers MUST implement server/discover to advertise their
  // supported versions. The literal below is deliberately hardcoded rather
  // than derived from the SDK: the sibling Marfa MCP server spent a release
  // claiming the current revision while serving only the legacy set, and its
  // suite passed because every assertion tracked what the library exported.
  // This pin is what fails when an SDK upgrade or a refactor quietly drops
  // the current revision from what this endpoint actually advertises.
  it('advertises the current revision via server/discover', async () => {
    const res = await handleMcpRequest(modernPost('server/discover'));
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      result?: {
        supportedVersions?: string[];
        resultType?: string;
        ttlMs?: number;
        cacheScope?: string;
      };
    };
    expect(body.result?.supportedVersions).toContain(MODERN_VERSION);
    expect(body.result?.resultType).toBe('complete');
    expect(typeof body.result?.ttlMs).toBe('number');
    expect(['public', 'private']).toContain(body.result?.cacheScope);
  });

  it('answers a 2026-07-28 tools/list carrying per-request metadata', async () => {
    const res = await handleMcpRequest(modernPost('tools/list'));
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { result?: { tools?: { name: string }[] } };
    const names = (body.result?.tools ?? []).map((t) => t.name).sort();
    expect(names).toEqual(['docs_fetch', 'docs_list_topics', 'docs_search']);
  });

  it('serves a modern tools/call without any handshake', async () => {
    const res = await handleMcpRequest(
      modernPost('tools/call', { name: 'docs_list_topics', arguments: {} }, 1, { 'Mcp-Name': 'docs_list_topics' }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { result?: { content?: { text: string }[] } };
    expect(body.result?.content?.[0]?.text).toContain('pages');
  });

  it('rejects an incomplete per-request envelope rather than guessing', async () => {
    const res = await handleMcpRequest(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'MCP-Protocol-Version': MODERN_VERSION,
          'Mcp-Method': 'tools/list',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: { _meta: { 'io.modelcontextprotocol/protocolVersion': MODERN_VERSION } },
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as { error?: { code?: number; message?: string } };
    expect(body.error?.code).toBe(-32602);
    expect(body.error?.message).toContain('clientCapabilities');
  });
});

describe('the legacy era is still served', () => {
  it('lists all three tools after a handshake', async () => {
    await initialize();
    const res = await handleMcpRequest(legacyPost({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    const body = (await readJson(res)) as { result?: { tools?: { name: string }[] } };
    const names = (body.result?.tools ?? []).map((t) => t.name).sort();
    expect(names).toEqual(['docs_fetch', 'docs_list_topics', 'docs_search']);
  });

  it('runs docs_search and returns grouped hits', async () => {
    const res = await handleMcpRequest(
      legacyPost({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'docs_search', arguments: { query: 'items', limit: 3 } },
      }),
    );
    const body = (await readJson(res)) as { result?: { content?: { text: string }[] } };
    const payload = JSON.parse(body.result?.content?.[0]?.text ?? '{}') as {
      hits?: { title: string; url: string; snippets: string[] }[];
    };
    expect(Array.isArray(payload.hits)).toBe(true);
    expect(payload.hits!.length).toBeGreaterThan(0);
    expect(payload.hits!.length).toBeLessThanOrEqual(3);
    for (const hit of payload.hits!) {
      expect(typeof hit.url).toBe('string');
      expect(Array.isArray(hit.snippets)).toBe(true);
    }
  });
});

describe('tool results match what the tool descriptions promise', () => {
  // The description is the only thing a model reads before choosing a tool, so
  // a description that names fields the handler does not return is a defect.
  it('docs_list_topics returns the keys its description advertises', async () => {
    const listRes = await handleMcpRequest(legacyPost({ jsonrpc: '2.0', id: 4, method: 'tools/list' }));
    const listed = (await readJson(listRes)) as { result?: { tools?: { name: string; description?: string }[] } };
    const described = listed.result?.tools?.find((t) => t.name === 'docs_list_topics')?.description ?? '';

    const res = await handleMcpRequest(
      legacyPost({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'docs_list_topics', arguments: {} } }),
    );
    const body = (await readJson(res)) as { result?: { content?: { text: string }[] } };
    const payload = JSON.parse(body.result?.content?.[0]?.text ?? '{}') as {
      pages?: Record<string, unknown>[];
    };
    expect(payload.pages?.length).toBeGreaterThan(0);

    const keys = Object.keys(payload.pages![0]!).sort();
    expect(keys).toEqual(['breadcrumbs', 'description', 'title', 'url']);
    for (const key of keys) {
      expect(described, `description omits "${key}"`).toContain(key);
    }
  });

  it('docs_fetch reports a miss as an error result rather than prose', async () => {
    const res = await handleMcpRequest(
      legacyPost({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'docs_fetch', arguments: { path: '/definitely/not/a/page' } },
      }),
    );
    const body = (await readJson(res)) as {
      result?: { isError?: boolean; content?: { text: string }[] };
    };
    expect(body.result?.isError).toBe(true);
    const payload = JSON.parse(body.result?.content?.[0]?.text ?? '{}') as Record<string, unknown>;
    expect(payload['error']).toBe('not_found');
    // A client should be able to show the message as-is rather than reformat it.
    expect(payload['message']).toBe('No docs page at /definitely/not/a/page');
    expect(payload['slugs']).toEqual(['definitely', 'not', 'a', 'page']);
  });
});
