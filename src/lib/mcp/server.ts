/**
 * Docs MCP server — in-tree handler exposing three tools over the Model Context Protocol:
 *
 *   - docs_search(query, limit?) — full-text BM25 against the docs corpus
 *   - docs_fetch(path)            — return the markdown body for a docs URL
 *   - docs_list_topics()          — return the hierarchical taxonomy
 *
 * Backed by Fumadocs's Orama BM25 search and the same `source` instance that
 * powers `/llms.txt` and the `<path>.md` content negotiation. Dense embeddings
 * are deferred — BM25 alone hits the "no API key on self-hosters" bar from the
 * Docs Architecture artifact, and the recall floor is good enough for v1.
 *
 * Transport: HTTP, exposed at `/mcp` on `docs.marfa.so`. Stateless — every
 * request carries its own JSON-RPC envelope. CORS is permissive (`*`) since
 * docs are public.
 */

import { createFromSource } from 'fumadocs-core/search/server';
import { source, getLLMText } from '@/lib/source';

const search = createFromSource(source, { language: 'english' });

/** JSON-RPC error codes — standard set we care about. */
const RPC_PARSE_ERROR = -32700;
const RPC_INVALID_REQUEST = -32600;
const RPC_METHOD_NOT_FOUND = -32601;
const RPC_INVALID_PARAMS = -32602;
const RPC_INTERNAL_ERROR = -32603;

type JsonRpcRequest = {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: string | number | null;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

/** Three tool descriptors returned by `tools/list`. */
const TOOLS = [
  {
    name: 'docs_search',
    description:
      'Full-text search over the Marfa docs corpus. Returns up to `limit` hits ranked by BM25 relevance, each with a title, canonical URL, and a snippet of matching content.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query.' },
        limit: {
          type: 'integer',
          description: 'Maximum hits to return (default 10, max 50).',
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'docs_fetch',
    description:
      'Fetch the markdown body of a single docs page by its URL path (e.g. "/guides/core-model/items"). Returns the same markdown the `<path>.md` content-negotiation surface returns — title, description, full prose with code blocks preserved.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Docs URL path. Accepts "/x/y", "x/y", or a legacy "/docs/x/y".',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'docs_list_topics',
    description:
      'List every docs page as a flat array of { title, url, breadcrumb } entries. Use to discover the full taxonomy without traversing the navigation tree.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
] as const;

/** Normalise a docs path into the slug array `source.getPage` expects. */
function pathToSlugs(input: string): string[] {
  let p = input.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) {
    try {
      p = new URL(p).pathname;
    } catch {
      // fall through; treat as bare path
    }
  }
  // strip leading slash + optional /docs prefix
  p = p.replace(/^\/+/, '');
  p = p.replace(/^docs\/?/, '');
  // strip trailing slash + .md suffix
  p = p.replace(/\.md$/i, '');
  p = p.replace(/\/+$/, '');
  if (p === '') return [];
  return p.split('/');
}

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === 'docs_search') {
    const query = typeof args.query === 'string' ? args.query : '';
    const limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 50) : 10;
    if (!query.trim()) {
      return { content: [{ type: 'text', text: JSON.stringify({ hits: [] }) }] };
    }
    const results = await search.search(query, { limit });
    // Group flat results by page url + collect snippets so the model gets one
    // entry per page, not one entry per heading/text fragment.
    const byUrl = new Map<
      string,
      { title: string; url: string; snippets: string[] }
    >();
    for (const r of results) {
      const url = r.url;
      if (!byUrl.has(url)) {
        const title =
          r.type === 'page'
            ? r.content
            : Array.isArray(r.breadcrumbs) && r.breadcrumbs.length > 0
              ? r.breadcrumbs[0]
              : r.content;
        byUrl.set(url, { title, url, snippets: [] });
      }
      const entry = byUrl.get(url)!;
      if (r.type !== 'page' && r.content && entry.snippets.length < 3) {
        entry.snippets.push(r.content);
      }
    }
    const hits = Array.from(byUrl.values()).slice(0, limit);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ hits }, null, 2),
        },
      ],
    };
  }

  if (name === 'docs_fetch') {
    const path = typeof args.path === 'string' ? args.path : '';
    if (!path.trim()) {
      throw { code: RPC_INVALID_PARAMS, message: 'docs_fetch: `path` is required' };
    }
    const slugs = pathToSlugs(path);
    const page = source.getPage(slugs);
    if (!page) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'not_found', path, slugs }),
          },
        ],
        isError: true,
      };
    }
    const markdown = await getLLMText(page);
    return {
      content: [{ type: 'text', text: markdown }],
    };
  }

  if (name === 'docs_list_topics') {
    const pages = source.getPages().map((p) => ({
      title: p.data.title,
      url: p.url,
      description: p.data.description ?? null,
      // breadcrumbs derived from the URL's path segments
      breadcrumbs: p.url.split('/').filter(Boolean),
    }));
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ pages }, null, 2),
        },
      ],
    };
  }

  throw { code: RPC_METHOD_NOT_FOUND, message: `unknown tool: ${name}` };
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

function rpcResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

/** Handle a single JSON-RPC request; returns the response envelope. */
async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const id = req.id ?? null;

  if (req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return rpcError(id, RPC_INVALID_REQUEST, 'invalid JSON-RPC envelope');
  }

  try {
    switch (req.method) {
      case 'initialize': {
        // Standard MCP handshake response.
        return rpcResult(id, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'marfa-docs', version: '0.1.0' },
          capabilities: { tools: { listChanged: false } },
        });
      }
      case 'notifications/initialized':
      case 'initialized':
        // Client signalling it's ready — no response needed for notifications,
        // but echo a null result so single-request callers don't hang.
        return rpcResult(id, null);
      case 'tools/list':
        return rpcResult(id, { tools: TOOLS });
      case 'tools/call': {
        const params = (req.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
        if (typeof params.name !== 'string') {
          return rpcError(id, RPC_INVALID_PARAMS, '`name` is required');
        }
        const result = await handleToolCall(params.name, params.arguments ?? {});
        return rpcResult(id, result);
      }
      case 'ping':
        return rpcResult(id, {});
      default:
        return rpcError(id, RPC_METHOD_NOT_FOUND, `method not supported: ${req.method}`);
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
      const rpcErr = err as { code: number; message: string; data?: unknown };
      return rpcError(id, rpcErr.code, rpcErr.message, rpcErr.data);
    }
    const message = err instanceof Error ? err.message : 'internal error';
    return rpcError(id, RPC_INTERNAL_ERROR, message);
  }
}

/** Public entry: convert an incoming HTTP request into a JSON-RPC response. */
export async function handleMcpRequest(request: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // GET — quick liveness/capabilities probe so operators can curl the URL.
  if (request.method === 'GET') {
    return new Response(
      JSON.stringify(
        {
          name: 'marfa-docs',
          version: '0.1.0',
          description: 'Marfa documentation MCP server.',
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
          endpoint: '/mcp',
          transport: 'http+json-rpc-2.0',
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'POST required' },
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', Allow: 'POST', ...corsHeaders },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: RPC_PARSE_ERROR, message: 'parse error' },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }

  // Batch support — JSON-RPC 2.0 allows an array of requests in one POST.
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: RPC_INVALID_REQUEST, message: 'empty batch' },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }
    const responses = await Promise.all(payload.map((r) => dispatch(r as JsonRpcRequest)));
    return new Response(JSON.stringify(responses), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const response = await dispatch(payload as JsonRpcRequest);
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
