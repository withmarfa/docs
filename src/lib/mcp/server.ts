/**
 * Docs MCP — HTTP transport, mounted at `/mcp`.
 *
 * The protocol is handled by the official SDK rather than by hand. The
 * hand-written version that preceded this accumulated four independent
 * conformance defects without anything noticing, because no client in normal
 * use was strict enough to complain and there was no library holding it to the
 * specification.
 *
 * Revisions served, deliberately, both from one server definition:
 *
 *   - 2026-07-28, the current revision: per-request metadata, no handshake,
 *     no protocol-level sessions.
 *   - The handshake era (2025-11-25 and earlier), served statelessly. Every
 *     client in practical use still opens with `initialize`, so dropping this
 *     would strand them for no gain.
 *
 * `legacy: 'stateless'` is the SDK default and is named here so the choice is
 * visible: a fresh server per request, no session to keep. That matters on a
 * Worker, which cannot hold one across requests without a stateful primitive,
 * and it is the shape the current revision mandates anyway.
 */

import { createMcpHandler } from '@modelcontextprotocol/server';
import { createDocsServer } from './tools';

/**
 * Permissive CORS, kept deliberately.
 *
 * The specification tells servers to validate `Origin` to blunt DNS rebinding.
 * That protects local servers holding privileged access; this one is public,
 * unauthenticated and read-only, serving a corpus that is already on the open
 * web, so there is no cross-origin action worth forging. Browser-based clients
 * are real, and refusing them would cost something to protect nothing.
 */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Content-Type',
    'Authorization',
    'MCP-Protocol-Version',
    'Mcp-Session-Id',
    'Mcp-Method',
    'Mcp-Name',
  ].join(', '),
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

const handler = createMcpHandler(() => createDocsServer(), { legacy: 'stateless' });

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** Public entry: serve one HTTP request against the docs MCP endpoint. */
export async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return withCors(await handler.fetch(request));
}
