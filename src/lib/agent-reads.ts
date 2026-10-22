import { POSTHOG_API_HOST } from '@/lib/analytics';
import { DOCS_TOOL_NAMES } from '@/lib/mcp/tools';
import { markdownPathToSlugs, pageForPath, source } from '@/lib/source';
import type { Stage } from '@/lib/worker';

/**
 * Counts the requests that agents make, which no browser script sees.
 *
 * An agent that fetches a `.md` copy, `/llms.txt`, `/mcp` or a JSON address
 * runs no page script, so the PostHog client never hears of it. The Worker
 * sends one event for each such request instead.
 *
 * **The event is a count and nothing more.** It holds the kind of address, the
 * method, the status, a client class from a closed list and, for a few kinds,
 * a page path from the docs, an MCP method and tool name from closed lists and
 * a number of hits. It never holds the client's address, a cookie, the
 * `User-Agent`, a query, a page's text or anything else a client typed, and it
 * is sent with no person profile and no GeoIP lookup. The same rule keeps
 * every value that came from a client out of the event unless it was matched
 * against what this site itself knows: a path that is no page is left out, and
 * a client name or tool name that is on no list becomes `other`.
 *
 * This module is for the docs Worker only. The status Worker has no `@/` alias
 * and never imports it.
 */

export const AGENT_READ_EVENT = 'agent_read';

/** PostHog's single-event capture address on the host the sites already use. */
export const CAPTURE_URL = `${POSTHOG_API_HOST}/i/v0/e/`;

export type Surface =
  | 'markdown'
  | 'llms_txt'
  | 'llms_full_txt'
  | 'docs_map'
  | 'mcp'
  | 'search'
  | 'topics'
  | 'api_other';

/** What a client says it is, reduced to a class. The raw `User-Agent` is never kept. */
export type ClientClass =
  | 'claude-code'
  | 'claude'
  | 'codex'
  | 'chatgpt'
  | 'marfa-cli'
  | 'browser'
  | 'script'
  | 'other';

/** The MCP methods that get a name of their own. Any other method is `other`. */
export type McpMethod = 'initialize' | 'tools/list' | 'tools/call' | 'other';

const MCP_METHODS: readonly string[] = ['initialize', 'tools/list', 'tools/call'];

/**
 * Matched in order, so the specific clients win over the generic ones. A client
 * class answers "which agent is this" and nothing finer: a version, a platform
 * or any other part of the string is dropped.
 */
const CLIENT_PATTERNS: [ClientClass, RegExp][] = [
  ['marfa-cli', /^marfa\//i],
  ['claude-code', /claude[-_ ]?(code|cli)/i],
  ['claude', /claude|anthropic/i],
  ['codex', /codex/i],
  ['chatgpt', /chatgpt|gptbot|oai-searchbot|openai/i],
  ['browser', /^mozilla\//i],
  ['script', /^(curl|wget|httpie|python|node|undici|axios|go-http-client|libwww|okhttp|java)\b|python-requests|aiohttp|httpx/i],
];

/** Reduces a client's self-description, from a `User-Agent` or an MCP client name, to a class. */
export function clientClass(description: string | null | undefined): ClientClass {
  if (!description) return 'other';
  for (const [name, pattern] of CLIENT_PATTERNS) {
    if (pattern.test(description)) return name;
  }
  return 'other';
}

type Read = {
  surface: Surface;
  /** A path this site knows: a page, or one of its fixed addresses. */
  path?: string;
  /** How a Markdown copy was asked for. */
  via?: 'path' | 'accept';
};

/** What a request to an agent address is, or `null` for any other request. */
export function describeRead(request: Request): Read | null {
  if (request.method === 'OPTIONS') return null;
  const { pathname } = new URL(request.url);

  switch (pathname) {
    case '/mcp':
      return { surface: 'mcp', path: '/mcp' };
    case '/api/docs/search':
      return { surface: 'search', path: pathname };
    case '/api/docs/topics':
      return { surface: 'topics', path: pathname };
    case '/llms.txt':
      return { surface: 'llms_txt', path: pathname };
    case '/llms-full.txt':
      return { surface: 'llms_full_txt', path: pathname };
    case '/docs-map.md':
      return { surface: 'docs_map', path: pathname };
  }

  if (pathname.startsWith('/api/docs/')) return { surface: 'api_other' };

  if (pathname.endsWith('.md')) {
    // The same lookup the `.md` route makes, so a path counts exactly when the
    // route finds a page. Anything else is a miss, and its text is not kept.
    const page = source.getPage(markdownPathToSlugs(pathname.replace(/^\//, '').split('/')));
    return { surface: 'markdown', via: 'path', ...(page ? { path: page.url } : {}) };
  }

  return null;
}

/**
 * A page address that answered Markdown because the client asked for it. The
 * answer says so, which keeps `Accept` read in one place: the negotiation stage
 * in `src/lib/worker.ts`.
 */
function describeNegotiated(request: Request, response: Response): Read | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (!(response.headers.get('Content-Type') ?? '').toLowerCase().startsWith('text/markdown')) return null;
  const page = pageForPath(new URL(request.url).pathname);
  return page ? { surface: 'markdown', via: 'accept', path: page.url } : null;
}

type McpFacts = { method: McpMethod; tool?: string; client?: ClientClass };

/** The most of a request body the Worker reads to name an MCP call. A larger one is `other`. */
const MAX_BODY_BYTES = 64 * 1024;

async function readBounded(body: ReadableStream<Uint8Array> | null): Promise<string | null> {
  if (!body) return null;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * What the MCP request is, read from its JSON-RPC message. The tool is named
 * only when it is one the server has, and the client only as a class. A batch
 * is `other`: the current revisions do not send one.
 */
export function mcpFacts(text: string | null): McpFacts {
  let message: unknown;
  try {
    message = text === null ? undefined : JSON.parse(text);
  } catch {
    return { method: 'other' };
  }
  if (!isRecord(message) || typeof message.method !== 'string') return { method: 'other' };

  const method: McpMethod = MCP_METHODS.includes(message.method) ? (message.method as McpMethod) : 'other';
  const params = isRecord(message.params) ? message.params : {};
  const facts: McpFacts = { method };

  if (method === 'tools/call') {
    const tool = (DOCS_TOOL_NAMES as readonly unknown[]).includes(params.name) ? (params.name as string) : 'other';
    facts.tool = tool;
  }

  // `initialize` carries the client in `clientInfo`; the current revision
  // carries it in `_meta` on every request.
  const meta = isRecord(params._meta) ? params._meta['io.modelcontextprotocol/clientInfo'] : undefined;
  const info = isRecord(params.clientInfo) ? params.clientInfo : isRecord(meta) ? meta : undefined;
  if (info && typeof info.name === 'string') facts.client = clientClass(info.name);

  return facts;
}

/** How many hits a search answered, from the JSON or the one event-stream message an MCP call answers with. */
export function hitsIn(text: string, mcp: boolean): number | undefined {
  try {
    let value: unknown;
    if (mcp) {
      const data = text.split('\n').find((line) => line.startsWith('data:'));
      value = JSON.parse(data ? data.slice(5) : text);
      if (!isRecord(value) || !isRecord(value.result)) return undefined;
      value = value.result.structuredContent;
    } else {
      value = JSON.parse(text);
    }
    return isRecord(value) && Array.isArray(value.hits) ? value.hits.length : undefined;
  } catch {
    return undefined;
  }
}

export type AgentReadEvent = {
  api_key: string;
  event: typeof AGENT_READ_EVENT;
  distinct_id: string;
  properties: Record<string, string | number | boolean>;
};

export function buildEvent(key: string, fields: {
  read: Read;
  method: string;
  status: number;
  client: ClientClass;
  mcp?: McpFacts;
  hits?: number;
}): AgentReadEvent {
  const { read, mcp } = fields;
  return {
    api_key: key,
    event: AGENT_READ_EVENT,
    // The capture API wants one, and PostHog advises against a fixed value for
    // anonymous events. A fresh random one per event names nobody, and joins
    // no two events.
    distinct_id: crypto.randomUUID(),
    properties: {
      $process_person_profile: false,
      $geoip_disable: true,
      site: 'docs',
      surface: read.surface,
      method: fields.method,
      status: fields.status,
      client: fields.client,
      ...(read.path !== undefined && { path: read.path }),
      ...(read.via !== undefined && { via: read.via }),
      ...(mcp && { mcp_method: mcp.method }),
      ...(mcp?.tool !== undefined && { mcp_tool: mcp.tool }),
      ...(fields.hits !== undefined && { hits: fields.hits }),
    },
  };
}

export type AgentReadOptions = {
  /** The PostHog project key the build was given. Empty means send nothing. */
  key: string;
  /** Keeps the Worker alive until the event is sent, without holding the response. */
  waitUntil: (promise: Promise<unknown>) => void;
  /** Where the event goes. Tests pass a fake; the Worker uses `fetch`. */
  fetch?: typeof fetch;
};

const SEND_TIMEOUT_MS = 5000;

/**
 * The stage that counts agent reads. It sits outside the others, so a request
 * the rate limit refuses is counted too, with its `429`.
 *
 * Nothing in it can fail the request: every step that touches the event is
 * inside a `try`, the send runs after the response is returned, and a failed
 * send is dropped.
 */
export function agentReads({ key, waitUntil, fetch: send = fetch }: AgentReadOptions): Stage {
  return async (request, next) => {
    if (!key) return next(request);

    let read: Read | null = null;
    let body: Promise<string | null> | undefined;
    try {
      read = describeRead(request);
      if (read?.surface === 'mcp' && request.method === 'POST') {
        body = readBounded(request.clone().body).catch(() => null);
      }
    } catch {
      read = null;
    }

    const response = await next(request);

    try {
      read ??= describeNegotiated(request, response);
      if (!read) return response;
      const counted = read;
      const answer =
        response.status === 200 && (counted.surface === 'search' || counted.surface === 'mcp')
          ? response.clone()
          : undefined;
      const userAgent = clientClass(request.headers.get('User-Agent'));

      waitUntil(
        (async () => {
          try {
            const mcp = counted.surface === 'mcp' && request.method === 'POST' ? mcpFacts((await body) ?? null) : undefined;
            const wantsHits = counted.surface === 'search' || mcp?.tool === DOCS_TOOL_NAMES[0];
            const hits = answer && wantsHits ? hitsIn(await answer.text(), counted.surface === 'mcp') : undefined;
            const client = mcp?.client && mcp.client !== 'other' ? mcp.client : userAgent;

            const event = buildEvent(key, { read: counted, method: request.method, status: response.status, client, mcp, hits });
            const sent = await send(CAPTURE_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(event),
              signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
            });
            await sent.body?.cancel();
          } catch {
            // A count that cannot be sent is lost. It must never reach the response.
          }
        })(),
      );
    } catch {
      // Nor may anything above it.
    }
    return response;
  };
}
