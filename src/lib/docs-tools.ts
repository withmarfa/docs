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

/** Rows requested from Orama per page asked for, since one page returns several rows. */
const ROWS_PER_PAGE = 5;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Orama rows carry the `<mark>` highlight and may carry HTML entities; callers get plain text. */
function toPlainText(text: string): string {
  return text
    .replace(/<\/?mark>/g, '')
    .replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (whole, dec, hex, name) => {
      if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? whole;
      const code = dec ? Number(dec) : parseInt(hex, 16);
      return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    });
}

/** Full-text search, one hit per page, ranked by the page's best row. */
export async function searchDocs(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): Promise<{ hits: SearchHit[] }> {
  if (!query.trim()) return { hits: [] };
  const cap = Math.min(Math.max(Math.trunc(limit), 1), MAX_SEARCH_LIMIT);

  const results = await searchServer.search(query, { limit: cap * ROWS_PER_PAGE });

  // Orama returns one row per heading or text fragment. Fold the rows of a page
  // into one hit, keeping each fragment's text as a snippet.
  const byPage = new Map<string, SearchHit>();
  for (const r of results) {
    const url = r.url.split('#')[0];
    let entry = byPage.get(url);
    if (!entry) {
      const page = source.getPage(pathToSlugs(url));
      const title =
        page?.data.title ??
        toPlainText(
          r.type === 'page' || !Array.isArray(r.breadcrumbs) || r.breadcrumbs.length === 0
            ? r.content
            : r.breadcrumbs[0],
        );
      entry = { title, url, snippets: [] };
      byPage.set(url, entry);
    }
    if (r.type !== 'page' && r.content && entry.snippets.length < MAX_SNIPPETS_PER_PAGE) {
      entry.snippets.push(toPlainText(r.content));
    }
  }

  return { hits: Array.from(byPage.values()).slice(0, cap) };
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
