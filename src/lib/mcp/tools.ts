/**
 * Docs MCP: the server definition, shared by every transport.
 *
 * Three read-only tools, each an adapter over `src/lib/docs-tools.ts`:
 *
 *   - docs_search(query, limit?) full-text BM25 against the docs corpus
 *   - docs_fetch(path)           the markdown body for a docs URL
 *   - docs_list_topics()         every page as a flat list
 *
 * This module owns the tools and nothing else. Transports mount it rather than
 * redefining it, so an HTTP caller and a stdio caller cannot observe different
 * tool surfaces.
 */

import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  fetchDocsPage,
  listTopics,
  pathToSlugs,
  searchDocs,
} from '@/lib/docs-tools';

export const SERVER_NAME = 'marfa-docs';
export const SERVER_VERSION = '1.0.0';

/** Wrap a JSON payload as the single text block MCP tool results carry. */
function jsonContent(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

/**
 * Build a server instance with the three docs tools registered.
 *
 * A fresh instance per request is the expected shape for stateless serving:
 * the tools close over module-scope state only, so construction is cheap.
 */
export function createDocsServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    'docs_search',
    {
      description:
        'Full-text search over the Marfa docs corpus. Returns up to `limit` hits ranked by BM25 relevance, each with a title, canonical URL, and snippets of matching content.',
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        query: z.string().describe('Search query.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_SEARCH_LIMIT)
          .optional()
          .describe(`Maximum hits to return (default ${DEFAULT_SEARCH_LIMIT}, max ${MAX_SEARCH_LIMIT}).`),
      }),
    },
    async ({ query, limit }) => jsonContent(await searchDocs(query, limit)),
  );

  server.registerTool(
    'docs_fetch',
    {
      description:
        'Fetch the markdown body of a single docs page by its URL path (e.g. "/properties-metadata-and-edges"). Returns the same markdown the `<path>.md` copy returns: a heading with the page title and path, then the full prose with code blocks preserved.',
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        path: z
          .string()
          .describe('Docs URL path. Accepts "/x/y", "x/y", or a legacy "/docs/x/y".'),
      }),
    },
    async ({ path }) => {
      if (!path.trim()) {
        return jsonContent({ error: 'invalid_path', message: '`path` is required' }, true);
      }
      const markdown = await fetchDocsPage(path);
      if (markdown === null) {
        // `message` carries a sentence a client can show without reformatting;
        // `slugs` shows how the path was interpreted, which is what makes a
        // near-miss diagnosable.
        return jsonContent(
          { error: 'not_found', message: `No docs page at ${path}`, path, slugs: pathToSlugs(path) },
          true,
        );
      }
      return { content: [{ type: 'text' as const, text: markdown }] };
    },
  );

  server.registerTool(
    'docs_list_topics',
    {
      description:
        'List every docs page as a flat array of { title, url, description, breadcrumbs } entries. Use to discover the full taxonomy without traversing the navigation tree.',
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({}),
    },
    async () => jsonContent(listTopics()),
  );

  return server;
}
