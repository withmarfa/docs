#!/usr/bin/env node
/**
 * Docs MCP — stdio transport entry point.
 *
 * Reads JSON-RPC 2.0 messages line-by-line from stdin, proxies each one to the
 * HTTP MCP route, and writes the response to stdout (one JSON object per line).
 *
 * The HTTP route is the canonical implementation (the Fumadocs source layer is
 * Vite-bundled and not runnable in vanilla Node). Stdio is a thin shim — it
 * lets MCP clients that only speak stdio (some Claude Desktop / Cursor
 * configurations) reach the docs MCP without needing HTTP MCP support.
 *
 * Configure the target URL with `MARFA_DOCS_URL` (defaults to
 * `https://docs.marfa.so`). For local self-hosted use, run `pnpm dev` to
 * bring up Vite at `http://localhost:3000`, then:
 *
 *   MARFA_DOCS_URL=http://localhost:3000 pnpm mcp:stdio
 *
 * For Claude Code / Desktop stdio MCP registration, point at:
 *
 *   command: node
 *   args: ["--experimental-strip-types", "/absolute/path/to/withmarfa/docs/src/lib/mcp/stdio.ts"]
 *   env: { MARFA_DOCS_URL: "https://docs.marfa.so" }
 */

import readline from 'node:readline';

const DOCS_URL = (process.env.MARFA_DOCS_URL ?? 'https://docs.marfa.so').replace(/\/+$/, '');
const MCP_URL = `${DOCS_URL}/mcp`;

const rl = readline.createInterface({
  input: process.stdin,
  output: undefined,
  terminal: false,
});

const inflight = new Set<Promise<void>>();
let stdinClosed = false;

async function proxy(payload: unknown): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function handleLine(line: string): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  const task = (async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'parse error' },
        }) + '\n',
      );
      return;
    }

    try {
      const response = await proxy(parsed);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      const id =
        parsed && typeof parsed === 'object' && 'id' in parsed
          ? (parsed as { id: unknown }).id
          : null;
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32603,
            message: `proxy failed: ${message}`,
            data: { mcp_url: MCP_URL },
          },
        }) + '\n',
      );
    }
  })();

  inflight.add(task);
  void task.finally(() => {
    inflight.delete(task);
    if (stdinClosed && inflight.size === 0) {
      process.exit(0);
    }
  });
}

rl.on('line', handleLine);

rl.on('close', () => {
  stdinClosed = true;
  if (inflight.size === 0) {
    process.exit(0);
  }
});
