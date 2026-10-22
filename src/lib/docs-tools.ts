/**
 * The docs tools, implemented once.
 *
 * Search, page fetch (whole, or one section) and the topic list over the docs
 * corpus. Two surfaces adapt these plain functions: the MCP server
 * (`src/lib/mcp/tools.ts`) and the JSON routes under `/api/docs/`
 * (`src/lib/docs-api.ts`). Search is Fumadocs's
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
  p = p.replace(/^docs(?:\/|$)/, '');
  p = p.replace(/\.md$/i, '');
  p = p.replace(/\/+$/, '');
  if (p === '') return [];
  return p.split('/');
}

/**
 * Rows requested per page asked for. Fumadocs returns a page as its own row
 * plus up to 8 matching sections (`groupBy.maxResult`), so fewer than 9 can
 * run out of rows before the limit's worth of pages.
 */
const ROWS_PER_PAGE = 9;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Fumadocs returns each row re-serialized as Markdown with `<mark>` around matches,
 * and re-serializing can encode characters as entities. Undo both.
 */
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
      // A table repeats the same cell text on every row, and each row is a hit.
      const snippet = toPlainText(r.content);
      if (!entry.snippets.includes(snippet)) entry.snippets.push(snippet);
    }
  }

  return { hits: Array.from(byPage.values()).slice(0, cap) };
}

/** The page's Markdown, the same text its `<path>.md` copy serves, or `null` when there is no such page. */
export async function fetchDocsPage(path: string): Promise<string | null> {
  const page = source.getPage(pathToSlugs(path));
  return page ? getLLMText(page) : null;
}

export interface PageHeading {
  /** 2 for `##`. The page title, a level-1 heading, is not listed. */
  level: number;
  text: string;
  /** The `[#id]` Fumadocs writes after a heading, or `null` when it wrote none. */
  id: string | null;
}

interface HeadingLine extends PageHeading {
  line: number;
}

const HEADING_LINE = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*$/;
const HEADING_ID = /[ \t]*\[#([^\]\s]+)\]$/;
const CODE_FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Headings with their line numbers, skipping any line inside a fenced code
 * block, where a shell comment looks like a heading. The first line is the page
 * title that `getLLMText` adds, and it is not part of the page's own outline.
 */
function scanHeadings(markdown: string): { lines: string[]; headings: HeadingLine[] } {
  const lines = markdown.split('\n');
  const headings: HeadingLine[] = [];
  let fence: string | null = null;
  lines.forEach((line, index) => {
    const opening = CODE_FENCE.exec(line)?.[1];
    if (fence) {
      if (opening && opening[0] === fence[0] && opening.length >= fence.length && line.trim() === opening) fence = null;
      return;
    }
    if (opening) {
      fence = opening;
      return;
    }
    if (index === 0) return;
    const match = HEADING_LINE.exec(line);
    if (!match) return;
    const idMatch = HEADING_ID.exec(match[2]);
    headings.push({
      level: match[1].length,
      text: idMatch ? match[2].slice(0, idMatch.index) : match[2],
      id: idMatch ? idMatch[1] : null,
      line: index,
    });
  });
  return { lines, headings };
}

/** The headings of a page's Markdown, in order. */
export function listHeadings(markdown: string): PageHeading[] {
  return scanHeadings(markdown).headings.map(({ level, text, id }) => ({ level, text, id }));
}

function normalizeHeading(text: string): string {
  return text.replace(/^#+\s*/, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * One heading of a page and everything under it, up to the next heading of the
 * same or a higher level, so a section keeps its subsections. The heading can
 * be named by its text, ignoring case, or by its id, which tells apart two
 * headings with the same text. Where two headings share a text, the first
 * wins. Returns `null` when the page has no such heading.
 */
export function extractSection(markdown: string, section: string): string | null {
  const wanted = normalizeHeading(section);
  if (!wanted) return null;
  const { lines, headings } = scanHeadings(markdown);
  const at = headings.findIndex((h) => normalizeHeading(h.text) === wanted || h.id?.toLowerCase() === wanted);
  if (at === -1) return null;
  const start = headings[at];
  const next = headings.slice(at + 1).find((h) => h.level <= start.level);
  return lines.slice(start.line, next ? next.line : lines.length).join('\n').trimEnd();
}

export type SectionResult =
  | { status: 'ok'; markdown: string }
  | { status: 'page_not_found' }
  | { status: 'section_not_found'; headings: PageHeading[] };

/** One section of a page, or the reason there is none. Use `fetchDocsPage` for the whole page. */
export async function fetchDocsSection(path: string, section: string): Promise<SectionResult> {
  const markdown = await fetchDocsPage(path);
  if (markdown === null) return { status: 'page_not_found' };
  const found = extractSection(markdown, section);
  return found === null ? { status: 'section_not_found', headings: listHeadings(markdown) } : { status: 'ok', markdown: found };
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
