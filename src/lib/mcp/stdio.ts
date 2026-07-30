#!/usr/bin/env node
/**
 * Docs MCP — stdio entry point for clients that do not speak HTTP.
 *
 * This is a bridge, not a second implementation. It runs a real MCP server on
 * stdio and a real MCP client against the HTTP endpoint, forwarding calls
 * between them. Both halves are the SDK's, so the stdio surface cannot drift
 * from the HTTP one: the tool list is discovered from the remote server at
 * startup rather than restated here.
 *
 * It bridges rather than mounting the tools directly because the Fumadocs
 * source layer is resolved through the bundler's path aliases and does not
 * load under plain Node. Point it at a local instance to serve a local corpus.
 *
 * Configure the target with `MARFA_DOCS_URL` (defaults to the hosted site):
 *
 *   MARFA_DOCS_URL=http://localhost:3000 pnpm mcp:stdio
 *
 * To register with a stdio-only client:
 *
 *   command: node
 *   args: ["--experimental-strip-types", "/absolute/path/to/docs/src/lib/mcp/stdio.ts"]
 */

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

const DOCS_URL = (process.env.MARFA_DOCS_URL ?? 'https://docs.marfa.so').replace(/\/+$/, '');
const MCP_URL = `${DOCS_URL}/mcp`;

const BRIDGE_NAME = 'marfa-docs';
const BRIDGE_VERSION = '1.0.0';

async function main(): Promise<void> {
  const upstream = new Client({ name: `${BRIDGE_NAME}-bridge`, version: BRIDGE_VERSION });
  await upstream.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));

  const server = new McpServer({ name: BRIDGE_NAME, version: BRIDGE_VERSION });

  // Mirror whatever the remote advertises. Discovering the list keeps this file
  // out of the business of knowing which tools exist.
  const { tools } = await upstream.listTools();
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        ...(tool.title ? { title: tool.title } : {}),
        ...(tool.description ? { description: tool.description } : {}),
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
        // `tools/list` returns the schema as loosely-typed JSON, which is what
        // `fromJsonSchema` exists to accept; the wire type is just wider.
        inputSchema: fromJsonSchema(tool.inputSchema as Parameters<typeof fromJsonSchema>[0]),
      },
      async (args) => upstream.callTool({ name: tool.name, arguments: args as Record<string, unknown> }),
    );
  }

  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`marfa-docs stdio bridge failed against ${MCP_URL}: ${message}`);
  process.exit(1);
});
