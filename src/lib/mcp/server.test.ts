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

import { AjvJsonSchemaValidator } from '@modelcontextprotocol/server/validators/ajv';
import { describe, expect, it } from 'vitest';
import { handleMcpRequest, mcpRateLimited } from './server';

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

/** Call a tool over the legacy era and return the JSON-RPC `result`. */
async function callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const res = await handleMcpRequest(
    legacyPost({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name, arguments: args } }),
  );
  return ((await readJson(res)) as { result: ToolResult }).result;
}

interface ToolResult {
  content?: { type: string; text: string }[];
  structuredContent?: unknown;
  isError?: boolean;
}

interface ListedTool {
  name: string;
  description?: string;
  inputSchema: { properties?: Record<string, { description?: string }> };
  outputSchema?: Record<string, unknown>;
}

async function listTools(request: Request): Promise<ListedTool[]> {
  const body = (await readJson(await handleMcpRequest(request))) as { result?: { tools?: ListedTool[] } };
  return body.result?.tools ?? [];
}

describe('the server tells an agent how to use it', () => {
  // 2025-06-18 and the other handshake revisions put `instructions` in the
  // initialize result; 2026-07-28 puts it in the server/discover result.
  it('returns instructions from a 2025-06-18 initialize', async () => {
    const body = (await readJson(await initialize(LEGACY_VERSION))) as { result?: { instructions?: unknown } };
    expect(typeof body.result?.instructions).toBe('string');
  });

  it('returns the same instructions from server/discover', async () => {
    const legacy = (await readJson(await initialize())) as { result?: { instructions?: string } };
    const modern = (await readJson(await handleMcpRequest(modernPost('server/discover')))) as {
      result?: { instructions?: string };
    };
    expect(typeof modern.result?.instructions).toBe('string');
    expect(modern.result?.instructions).toBe(legacy.result?.instructions);
  });

  it('says what each tool is for, that search never writes an answer and that no instance is reachable', async () => {
    const body = (await readJson(await initialize())) as { result?: { instructions?: string } };
    const text = body.result?.instructions ?? '';
    expect(text.length).toBeGreaterThan(0);
    expect(text.length, 'instructions should stay short').toBeLessThan(1200);
    for (const tool of ['docs_search', 'docs_fetch', 'docs_list_topics', 'section']) {
      expect(text, `names ${tool}`).toContain(tool);
    }
    expect(text).toMatch(/passages/i);
    expect(text).toMatch(/never a written answer/i);
    expect(text).toMatch(/cannot reach/i);
    expect(text).toMatch(/instance/i);
  });
});

describe('tools/list is deterministic', () => {
  // 2026-07-28, Tools: "Servers SHOULD return tools in a deterministic order."
  const ORDER = ['docs_search', 'docs_fetch', 'docs_list_topics'];

  it('lists the tools in the same fixed order on every request, in both eras', async () => {
    await initialize();
    const first = await listTools(legacyPost({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    const second = await listTools(legacyPost({ jsonrpc: '2.0', id: 3, method: 'tools/list' }));
    const modern = await listTools(modernPost('tools/list'));
    expect(first.map((t) => t.name)).toEqual(ORDER);
    expect(second).toEqual(first);
    expect(modern).toEqual(first);
  });
});

describe('structured results', () => {
  // 2026-07-28, Tools: a server that declares an `outputSchema` MUST return
  // structured results that conform to it, and SHOULD also return the
  // serialized JSON in a text block.
  const validator = new AjvJsonSchemaValidator();

  for (const [name, args] of [
    ['docs_search', { query: 'items', limit: 3 }],
    ['docs_search', { query: 'zxqvjkwpl' }],
    ['docs_list_topics', {}],
  ] as const) {
    it(`${name} ${JSON.stringify(args)} conforms to its declared outputSchema`, async () => {
      const tools = await listTools(legacyPost({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
      const schema = tools.find((t) => t.name === name)?.outputSchema;
      expect(schema, `${name} declares an outputSchema`).toBeDefined();

      const result = await callTool(name, args);
      expect(result.isError).toBeUndefined();
      const check = validator.getValidator(schema as never)(result.structuredContent);
      expect(check.valid, check.valid ? '' : check.errorMessage).toBe(true);
    });

    it(`${name} ${JSON.stringify(args)} repeats the structured content as JSON in one text block`, async () => {
      const result = await callTool(name, args);
      expect(result.content).toHaveLength(1);
      expect(result.content![0]!.type).toBe('text');
      expect(JSON.parse(result.content![0]!.text)).toEqual(result.structuredContent);
    });
  }

  it('serves the same structured content in the current revision', async () => {
    const modern = (await readJson(
      await handleMcpRequest(
        modernPost('tools/call', { name: 'docs_list_topics', arguments: {} }, 1, { 'Mcp-Name': 'docs_list_topics' }),
      ),
    )) as { result?: ToolResult };
    const legacy = await callTool('docs_list_topics', {});
    expect(modern.result?.structuredContent).toEqual(legacy.structuredContent);
    expect(JSON.parse(modern.result!.content![0]!.text)).toEqual(modern.result?.structuredContent);
  });

  it('keeps the text a client reads today: search hits and topic pages under the same keys', async () => {
    const search = await callTool('docs_search', { query: 'items', limit: 1 });
    expect(Object.keys(JSON.parse(search.content![0]!.text))).toEqual(['hits']);
    const topics = await callTool('docs_list_topics', {});
    expect(Object.keys(JSON.parse(topics.content![0]!.text))).toEqual(['pages']);
  });

  it('declares no outputSchema for docs_fetch, which returns Markdown and not JSON', async () => {
    const tools = await listTools(legacyPost({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    expect(tools.find((t) => t.name === 'docs_fetch')?.outputSchema).toBeUndefined();
    const result = await callTool('docs_fetch', { path: '/files' });
    expect(result.structuredContent).toBeUndefined();
    expect(result.content![0]!.text).toMatch(/^# Files \(\/files\)/);
  });
});

describe('docs_fetch takes the path forms its description lists', () => {
  const PAGE = '/files';

  it('describes the forms it accepts', async () => {
    const tools = await listTools(legacyPost({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    const description = tools.find((t) => t.name === 'docs_fetch')!.inputSchema.properties?.['path']?.description ?? '';
    expect(description).toContain('docs.marfa.so');
    expect(description).toContain('.md');
    expect(description).not.toContain('/docs/');
  });

  it('answers one page for each form', async () => {
    const whole = (await callTool('docs_fetch', { path: PAGE })).content![0]!.text;
    for (const path of ['files', '/files.md', 'files.md', '/files/', 'https://docs.marfa.so/files', 'https://docs.marfa.so/files.md']) {
      expect((await callTool('docs_fetch', { path })).content![0]!.text, path).toBe(whole);
    }
  });

  it('treats a /docs/ prefix as part of the path, so it is a miss', async () => {
    const result = await callTool('docs_fetch', { path: '/docs/files' });
    expect(result.isError).toBe(true);
    const payload = JSON.parse(result.content![0]!.text) as { error: string; slugs: string[] };
    expect(payload.error).toBe('not_found');
    expect(payload.slugs).toEqual(['docs', 'files']);
  });
});

describe('docs_fetch takes an optional section', () => {
  const PAGE = '/files';
  const HEADING = 'Who may read a blob';

  it('describes the section input', async () => {
    const tools = await listTools(legacyPost({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    const fetchTool = tools.find((t) => t.name === 'docs_fetch')!;
    expect(fetchTool.inputSchema.properties?.['section']?.description).toMatch(/heading/i);
    expect(fetchTool.description).toContain('section');
  });

  it('returns only the named heading section of the page', async () => {
    const whole = (await callTool('docs_fetch', { path: PAGE })).content![0]!.text;
    const result = await callTool('docs_fetch', { path: PAGE, section: HEADING });
    expect(result.isError).toBeUndefined();
    const text = result.content![0]!.text;
    expect(text.startsWith(`## ${HEADING}`)).toBe(true);
    expect(whole).toContain(text);
    expect(text.length).toBeLessThan(whole.length);
    expect(text).not.toContain('# Files');
    // The section stops where the next heading of its level or higher begins.
    expect(text.split('\n').filter((l) => /^#{1,2} /.test(l))).toHaveLength(1);
  });

  it('matches the heading ignoring case and surrounding space, and by its id', async () => {
    const exact = (await callTool('docs_fetch', { path: PAGE, section: HEADING })).content![0]!.text;
    for (const section of ['  who MAY read a blob ', '## Who may read a blob', 'who-may-read-a-blob', '#who-may-read-a-blob']) {
      const result = await callTool('docs_fetch', { path: PAGE, section });
      expect(result.isError, section).toBeUndefined();
      expect(result.content![0]!.text, section).toBe(exact);
    }
  });

  it('returns the whole page when the section is blank', async () => {
    const whole = (await callTool('docs_fetch', { path: PAGE })).content![0]!.text;
    for (const section of ['', '   ']) {
      expect((await callTool('docs_fetch', { path: PAGE, section })).content![0]!.text).toBe(whole);
    }
  });

  it('reports an unknown section as an error result that lists the real headings', async () => {
    const result = await callTool('docs_fetch', { path: PAGE, section: 'No such heading' });
    expect(result.isError).toBe(true);
    const payload = JSON.parse(result.content![0]!.text) as {
      error: string;
      message: string;
      path: string;
      section: string;
      headings: { level: number; text: string; id: string | null }[];
    };
    expect(payload.error).toBe('section_not_found');
    expect(payload.message).toBe('No section "No such heading" on /files');
    expect(payload.path).toBe(PAGE);
    expect(payload.section).toBe('No such heading');
    const texts = payload.headings.map((h) => h.text);
    expect(texts).toContain(HEADING);
    expect(texts).not.toContain('Files');
    expect(payload.headings.find((h) => h.text === HEADING)).toEqual({
      level: 2,
      text: HEADING,
      id: 'who-may-read-a-blob',
    });
  });

  it('still reports a missing page as not_found when a section is named', async () => {
    const result = await callTool('docs_fetch', { path: '/definitely/not/a/page', section: HEADING });
    expect(result.isError).toBe(true);
    expect((JSON.parse(result.content![0]!.text) as { error: string }).error).toBe('not_found');
  });
});

describe('a client over its limit', () => {
  // The tools specification says servers MUST rate limit tool invocations and
  // clients SHOULD respect it. The limit runs in the Worker (`src/lib/rate-limit.ts`),
  // ahead of this handler, and answers with this response.
  it('gets 429 with Retry-After and a JSON-RPC error that carries no id', async () => {
    const res = mcpRateLimited(60);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('60');
    expect(res.headers.get('content-type')).toBe('application/json');
    const body = (await res.json()) as { jsonrpc: string; id: unknown; error: { code: number; message: string } };
    expect(body).toMatchObject({ jsonrpc: '2.0', id: null });
    expect(body.error.code).toBe(-32000);
    expect(body.error.message).toContain('60 seconds');
  });

  it('is readable by a browser client, which sees Retry-After only when it is exposed', () => {
    const res = mcpRateLimited(60);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-expose-headers')).toContain('Retry-After');
  });
});
