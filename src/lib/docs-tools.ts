/**
 * The docs tools, implemented once.
 *
 * Search, page fetch and the topic list over the docs corpus. Two surfaces
 * adapt these plain functions: the MCP server (`src/lib/mcp/tools.ts`) and the
 * JSON routes under `/api/docs/` (`src/lib/docs-api.ts`). Search is Fumadocs's
 * Orama BM25 over the same `source` that powers `/llms.txt` and the `<path>.md`
 * copy of each page. Dense embeddings are deferred: BM25 alone needs no API
 * key from self-hosters, and its recall is good enough here.
 */

import { createFromSource } from 'fumadocs-core/search/server';
import { source, getLLMText } from '@/lib/source';

/**
 * Built once per isolate rather than per request. Fumadocs builds the Orama
 * index lazily on first query and caches it against this instance. The site's
 * search box (`/api/search`) uses the same instance, so one cold start builds
 * one index.
 */
export const searchServer = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});

/** Default and ceiling for a search, mirrored in the MCP tool description. */
export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 50;

/** Snippets kept per page, so one page cannot crowd out the rest of the hits. */
export const MAX_SNIPPETS_PER_PAGE = 3;

export interface SearchHit {
  title: string;
  url: string;
  snippets: string[];
}

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

/** Full-text search, one hit per page, ranked by BM25 relevance. */
export async function searchDocs(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): Promise<{ hits: SearchHit[] }> {
  if (!query.trim()) return { hits: [] };
  const cap = Math.min(Math.max(Math.trunc(limit), 1), MAX_SEARCH_LIMIT);

  const results = await searchServer.search(query, { limit: cap });

  // Orama returns one row per heading or text fragment. Group by page so the
  // caller gets one entry per document rather than several near-duplicates.
  const byUrl = new Map<string, SearchHit>();
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

  return { hits: Array.from(byUrl.values()).slice(0, cap) };
}

/** The page's Markdown, the same text its `<path>.md` copy serves, or `null` when there is no such page. */
export async function fetchDocsPage(path: string): Promise<string | null> {
  const page = source.getPage(pathToSlugs(path));
  return page ? getLLMText(page) : null;
}

/** Every page as a flat list. */
export function listTopics() {
  const pages = source.getPages().map((p) => ({
    title: p.data.title,
    url: p.url,
    description: p.data.description ?? null,
    breadcrumbs: p.url.split('/').filter(Boolean),
  }));
  return { pages };
}
