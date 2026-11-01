/**
 * Docs MCP: the server definition, shared by every transport.
 *
 * Three read-only tools, each an adapter over `src/lib/docs-tools.ts`:
 *
 *   - docs_search(query, limit?)  full-text BM25 against the docs corpus
 *   - docs_fetch(path, section?)  the Markdown body of a docs page, or one section of it
 *   - docs_list_topics()          every page as a flat list
 *
 * They are registered in that order, which is the order `tools/list` returns
 * them in. This module owns the tools and the server's instructions and
 * nothing else. Transports mount it rather than redefining it, so an HTTP
 * caller and a stdio caller cannot observe different tool surfaces.
 */

import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  fetchDocsPage,
  fetchDocsSection,
  listTopics,
  pathToSlugs,
  searchDocs,
} from '@/lib/docs-tools';

/** The tools in registration order. The Worker's request counting names a tool only if it is one of these. */
export const DOCS_TOOL_NAMES = ['docs_search', 'docs_fetch', 'docs_list_topics'] as const;

export const SERVER_NAME = 'marfa-docs';
export const SERVER_VERSION = '1.0.0';

/**
 * What the server tells a client at `initialize` and `server/discover`, for
 * the model that will choose among the tools.
 */
export const SERVER_INSTRUCTIONS = [
  'This server reads the Marfa documentation at docs.marfa.so and nothing else. It cannot reach a Marfa instance or anyone\'s data. To work with a person\'s data, an agent connects to their own instance\'s MCP server, which the page /marfa-mcp-server describes.',
  'Use docs_search to find pages. It returns matching passages and page paths, never a written answer. Use docs_fetch with a path from a result to read the whole page as Markdown, or add section, a heading from that page, to read only that part of a long page. Use docs_list_topics to list every page.',
  'Write your answer from what the pages say.',
].join('\n\n');

const jsonText = (payload: unknown) => JSON.stringify(payload, null, 2);

/** An error result: the JSON payload in the single text block. */
function jsonError(payload: unknown) {
  return { content: [{ type: 'text' as const, text: jsonText(payload) }], isError: true };
}

/**
 * A result with structured content. The same JSON is also the text block, which
 * is what a client that reads only `content` gets and what clients got before
 * results were structured.
 */
function structuredResult<T extends Record<string, unknown>>(payload: T) {
  return { content: [{ type: 'text' as const, text: jsonText(payload) }], structuredContent: payload };
}

const searchOutput = z.object({
  hits: z
    .array(
      z.object({
        title: z.string().describe('Page title.'),
        url: z.string().describe('Page path, such as "/files". Pass it to docs_fetch.'),
        snippets: z.array(z.string()).describe('Passages of the page that match the query, as plain text.'),
      }),
    )
    .describe('Matching pages, best first, one entry per page.'),
});

const topicsOutput = z.object({
  pages: z
    .array(
      z.object({
        title: z.string().describe('Page title.'),
        url: z.string().describe('Page path, such as "/files". Pass it to docs_fetch.'),
        description: z.string().nullable().describe('The page\'s one-sentence description, or null when it has none.'),
        breadcrumbs: z.array(z.string()).describe('The path segments of the page\'s url.'),
      }),
    )
    .describe('Every docs page.'),
});

/**
 * Build a server instance with the three docs tools registered.
 *
 * A fresh instance per request is the expected shape for stateless serving:
 * the tools close over module-scope state only, so construction is cheap.
 */
export function createDocsServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );

  server.registerTool(
    DOCS_TOOL_NAMES[0],
    {
      description:
        'Full-text search over the Marfa docs corpus. Returns up to `limit` hits ranked by BM25 relevance, each with a title, canonical URL, and snippets of matching content. It finds passages and links; it does not write an answer. Pass a hit\'s url to docs_fetch to read the page.',
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
      outputSchema: searchOutput,
    },
    async ({ query, limit }) => structuredResult(await searchDocs(query, limit)),
  );

  server.registerTool(
    DOCS_TOOL_NAMES[1],
    {
      description:
        'Fetch the Markdown body of one docs page by its path, such as "/build/write-safely". Returns the same Markdown as the `<path>.md` copy: a heading with the page title and path, then the full prose with code blocks preserved. Pass `section`, a heading from the page, to get only that heading and what is under it; an unknown heading is an error that lists the page\'s headings.',
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        path: z
          .string()
          .describe('Docs page path. Accepts "/x/y", "x/y", a full docs.marfa.so address, or any of them ending in ".md".'),
        section: z
          .string()
          .optional()
          .describe(
            'A heading on the page, by its text (any case) or its id. Returns only that heading and what is under it. Omit it for the whole page.',
          ),
      }),
    },
    async ({ path, section }) => {
      if (!path.trim()) {
        return jsonError({ error: 'invalid_path', message: '`path` is required' });
      }
      // `message` carries a sentence a client can show without reformatting;
      // `slugs` shows how the path was interpreted, which is what makes a
      // near-miss diagnosable.
      const notFound = () =>
        jsonError({ error: 'not_found', message: `No docs page at ${path}`, path, slugs: pathToSlugs(path) });

      // A blank section is no section: some clients send every optional field.
      if (!section?.trim()) {
        const markdown = await fetchDocsPage(path);
        return markdown === null ? notFound() : { content: [{ type: 'text' as const, text: markdown }] };
      }

      const result = await fetchDocsSection(path, section);
      switch (result.status) {
        case 'ok':
          return { content: [{ type: 'text' as const, text: result.markdown }] };
        case 'page_not_found':
          return notFound();
        case 'section_not_found':
          return jsonError({
            error: 'section_not_found',
            message: `No section "${section}" on ${path}`,
            path,
            section,
            headings: result.headings,
          });
      }
    },
  );

  server.registerTool(
    DOCS_TOOL_NAMES[2],
    {
      description:
        'List every docs page as a flat array of { title, url, description, breadcrumbs } entries. Use to discover the full taxonomy without traversing the navigation tree.',
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({}),
      outputSchema: topicsOutput,
    },
    async () => structuredResult(listTopics()),
  );

  return server;
}
