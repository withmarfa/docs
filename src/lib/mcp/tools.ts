/**
 * Docs MCP — the server definition, shared by every transport.
 *
 * Three read-only tools over the docs corpus:
 *
 *   - docs_search(query, limit?) — full-text BM25 against the docs corpus
 *   - docs_fetch(path)           — the markdown body for a docs URL
 *   - docs_list_topics()         — every page as a flat list
 *
 * Backed by Fumadocs's Orama BM25 search and the same `source` instance that
 * powers `/llms.txt` and the `<path>.md` copy of each page. Dense embeddings
 * are deferred: BM25 alone avoids requiring an API key from self-hosters, and
 * the recall floor is good enough here.
 *
 * This module owns the tools and nothing else. Transports mount it rather than
 * redefining it, so an HTTP caller and a stdio caller cannot observe different
 * tool surfaces.
 */

import { McpServer } from '@modelcontextprotocol/server';
import { createFromSource } from 'fumadocs-core/search/server';
import * as z from 'zod';
import { source, getLLMText } from '@/lib/source';

export const SERVER_NAME = 'marfa-docs';
export const SERVER_VERSION = '1.0.0';

/**
 * Built once per isolate rather than per request. Fumadocs builds the Orama
 * index lazily on first query and caches it against this instance, so sharing
 * it keeps the index build to one per cold start instead of one per call.
 */
const search = createFromSource(source, { language: 'english' });

/** Default and ceiling for `docs_search`, mirrored in the tool description. */
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;

/** Snippets kept per page, so one page cannot crowd out the rest of the hits. */
const MAX_SNIPPETS_PER_PAGE = 3;

/** Normalize a docs path into the slug array `source.getPage` expects. */
export function pathToSlugs(input: string): string[] {
  let p = input.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) {
    try {
      p = new URL(p).pathname;
    } catch {
      // Not a parseable URL after all; fall through and treat it as a bare path.
    }
  }
  p = p.replace(/^\/+/, '');
  p = p.replace(/^docs\/?/, '');
  p = p.replace(/\.md$/i, '');
  p = p.replace(/\/+$/, '');
  if (p === '') return [];
  return p.split('/');
}

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
    async ({ query, limit }) => {
      const cap = limit ?? DEFAULT_SEARCH_LIMIT;
      if (!query.trim()) return jsonContent({ hits: [] });

      const results = await search.search(query, { limit: cap });

      // Orama returns one row per heading or text fragment. Group by page so the
      // caller gets one entry per document rather than several near-duplicates.
      const byUrl = new Map<string, { title: string; url: string; snippets: string[] }>();
      for (const r of results) {
        if (!byUrl.has(r.url)) {
          const title =
            r.type === 'page'
              ? r.content
              : Array.isArray(r.breadcrumbs) && r.breadcrumbs.length > 0
                ? r.breadcrumbs[0]
                : r.content;
          byUrl.set(r.url, { title, url: r.url, snippets: [] });
        }
        const entry = byUrl.get(r.url)!;
        if (r.type !== 'page' && r.content && entry.snippets.length < MAX_SNIPPETS_PER_PAGE) {
          entry.snippets.push(r.content);
        }
      }

      return jsonContent({ hits: Array.from(byUrl.values()).slice(0, cap) });
    },
  );

  server.registerTool(
    'docs_fetch',
    {
      description:
        'Fetch the markdown body of a single docs page by its URL path (e.g. "/get-started/properties-metadata-and-edges"). Returns the same markdown the `<path>.md` copy returns: title, description, full prose with code blocks preserved.',
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
      const slugs = pathToSlugs(path);
      const page = source.getPage(slugs);
      if (!page) {
        // `message` carries a sentence a client can show without reformatting;
        // `slugs` shows how the path was interpreted, which is what makes a
        // near-miss diagnosable.
        return jsonContent(
          { error: 'not_found', message: `No docs page at ${path}`, path, slugs },
          true,
        );
      }
      return { content: [{ type: 'text' as const, text: await getLLMText(page) }] };
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
    async () => {
      const pages = source.getPages().map((p) => ({
        title: p.data.title,
        url: p.url,
        description: p.data.description ?? null,
        breadcrumbs: p.url.split('/').filter(Boolean),
      }));
      return jsonContent({ pages });
    },
  );

  return server;
}
