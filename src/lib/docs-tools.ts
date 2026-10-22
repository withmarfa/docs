/**
 * The docs tools, implemented once.
 *
 * Search, page fetch (whole, or one section) and the topic list over the docs
 * corpus. Three surfaces adapt these plain functions: the MCP server
 * (`src/lib/mcp/tools.ts`), the JSON routes under `/api/docs/`
 * (`src/lib/docs-api.ts`) and the site's search box (`/api/search`). Search is
 * Fumadocs's Orama BM25, with the tokenizer below, over the same `source` that
 * powers `/llms.txt` and the `<path>.md` copy of each page. Dense embeddings
 * are deferred: BM25 alone needs no API key from self-hosters, and its recall
 * is good enough here.
 */

import { createFromSource } from 'fumadocs-core/search/server';
import { source, getLLMText } from '@/lib/source';

/** Words a reader types around the one that matters. Dropped from a query, never from the index. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does', 'for', 'from', 'how',
  'i', 'if', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'so', 'that', 'the', 'this', 'to',
  'was', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
]);

/** A word, or words joined inside by a dot, hyphen or underscore: `print-token`, `next_cursor`, `core.note`. */
const WORD = /[\p{L}\p{N}]+(?:[._-][\p{L}\p{N}]+)*/gu;

/** Fold a plural to its singular, so `items` and `item` meet. Only plain words: a code is never stemmed. */
function stem(word: string): string {
  // A short word keeps its `s`: `cors` must not become `cor`, which prefix-matches every `correct`.
  if (word.length < 5 || !/^[a-z]+$/.test(word)) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (/(?:ss|us|is)$/.test(word)) return word;
  return word.endsWith('s') ? word.slice(0, -1) : word;
}

/**
 * Orama's default English tokenizer keeps a hyphen or underscore inside a
 * token, and a leading `--` with it, so `print-token` never met the
 * `--print-token` a page shows. Its stop words and stemming are off, so a
 * query's `a` matched every word that starts with `a`. This tokenizer joins a
 * compound's parts with `_` (`--print-token`, `print_token` and `Print-Token`
 * become `print_token`), folds a plural to its singular, ignores accents, case
 * and apostrophes, drops the `v` of a version, and treats the index and the
 * query differently:
 *
 * - The index holds a hyphenated name and its words, so `idempotency key` finds
 *   a page that writes `Idempotency-Key`. It holds a dotted name (`core.note`)
 *   whole and as its letter-only parts, so `note` finds a page that writes
 *   `core.note`, and a code (`type_not_permitted`, `0.0.24`) only whole,
 *   because a code's parts say nothing alone.
 * - A query holds the compound and, for a dotted name, its letter-only parts,
 *   so `core.task` finds the page about `task`. A code that no page writes,
 *   such as `NO_COLOR`, finds nothing instead of every page that says "no" or
 *   "color". A query also drops its stop words, unless nothing else is left.
 *
 * Orama passes the property name when it indexes and none when it searches,
 * which is how the two are told apart.
 */
export function tokenizeSearchText(text: string, forQuery: boolean): string[] {
  const folded = text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    // `owner's` and `can't` stay one word, not `owner, s`: a one-letter query token prefix-matches every word that starts with it.
    .replace(/['\u2019]/g, '')
    .toLowerCase()
    // `v0.0.24` and `0.0.24` are the same release.
    .replace(/\bv(?=\d+\.\d)/g, '');
  const tokens = new Set<string>();
  const words: string[] = [];
  for (const match of folded.match(WORD) ?? []) {
    const parts = match.split(/[._-]/);
    if (parts.length === 1) {
      words.push(match);
      continue;
    }
    tokens.add(parts.join('_'));
    // A hyphenated name is also its words (`Idempotency-Key`), and a dotted name its letter-only parts
    // (`core.task` is `core` and `task`; `0.0.24` is no number alone). An underscore code's parts say nothing
    // alone, and neither does a hyphenated name in a query, which holds the compound.
    const dotted = match.includes('.');
    if (match.includes('_') || (forQuery && !dotted)) continue;
    for (const part of parts) {
      if (part.length < 2 || (dotted && !/^\p{L}+$/u.test(part)) || (forQuery && STOP_WORDS.has(part))) continue;
      tokens.add(stem(part));
    }
  }
  // `what's` is `whats` once its apostrophe is gone, and folds to `what`.
  const kept = forQuery ? words.filter((w) => !STOP_WORDS.has(w) && !STOP_WORDS.has(stem(w))) : words;
  for (const word of kept.length > 0 ? kept : words) tokens.add(stem(word));
  return [...tokens];
}

/**
 * Built once per isolate rather than per request. Fumadocs builds the Orama
 * index lazily on first query and caches it against this instance. The site's
 * search box (`/api/search`) uses the same instance, so one cold start builds
 * one index.
 */
export const searchServer = createFromSource(source, {
  tokenizer: {
    language: 'english',
    normalizationCache: new Map(),
    tokenize: (raw, _language, property) => tokenizeSearchText(raw, property === undefined),
  },
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

/** The changelog repeats every term a reader might search for, so it ranks after an equally matching page. */
const CHANGELOG_URL = '/changelog';

/** A question the changelog answers: its name, a release, what changed or is new, a breaking change or a version number. */
const ASKS_ABOUT_A_RELEASE = /\b(?:changelog|releases?|what['\u2019]?s\s+new|what\s+changed|breaking|v?\d+\.\d+\.\d+)\b/i;

export function asksAboutARelease(query: string): boolean {
  return ASKS_ABOUT_A_RELEASE.test(query);
}

/** What a query must equal, once tokenized, to name a page: its title, or on a Catalog type page its identifier (`core.task`). */
function namesOf(url: string): string[] {
  const data = source.getPage(pathToSlugs(url))?.data as { title?: string; identifier?: string } | undefined;
  return [data?.title, data?.identifier].flatMap((name) => (name ? [tokenizeSearchText(name, true).join(' ')] : []));
}

/** A passage longer than this is cut at a word boundary, so a snippet stays a snippet. */
const MAX_PASSAGE_LENGTH = 240;

/** Remove the last occurrence of `mark` when the text has an odd number of them, so a cut never leaves one open. */
function closeMark(text: string, mark: string): string {
  const count = text.split(mark).length - 1;
  if (count % 2 === 0) return text;
  const at = text.lastIndexOf(mark);
  return `${text.slice(0, at)}${text.slice(at + mark.length)}`;
}

export function trimPassage(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= MAX_PASSAGE_LENGTH) return flat;
  const cut = flat.slice(0, MAX_PASSAGE_LENGTH);
  const space = cut.lastIndexOf(' ');
  // A word longer than the limit has no space to cut at, so it is cut where it stands.
  const words = space > 0 ? cut.slice(0, space) : cut;
  return `${closeMark(closeMark(words, '**'), '`').trimEnd()}...`;
}

interface StructuredPage {
  headings: { id: string; content: string }[];
  contents: { heading?: string; content: string }[];
}

/** The first passage under a heading, which is what a reader wants to see instead of the heading again. */
async function passageUnder(url: string, headingId: string): Promise<string | null> {
  const page = source.getPage(pathToSlugs(url));
  if (!page) return null;
  const data = page.data as { structuredData?: StructuredPage | (() => Promise<StructuredPage>) };
  const structured = typeof data.structuredData === 'function' ? await data.structuredData() : data.structuredData;
  const passage = structured?.contents.find((c) => c.heading === headingId && c.content.trim());
  return passage ? trimPassage(passage.content) : null;
}

/** Full-text search, one hit per page, ranked by the page's best row. */
export async function searchDocs(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): Promise<{ hits: SearchHit[] }> {
  if (!query.trim()) return { hits: [] };
  const cap = Math.min(Math.max(Math.trunc(limit), 1), MAX_SEARCH_LIMIT);

  // One page more than asked for: the changelog can move from first to last,
  // and the page that takes its place must already be in the results.
  const results = await searchServer.search(query, { limit: (cap + 1) * ROWS_PER_PAGE });

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
    if (r.type === 'page' || !r.content || entry.snippets.length >= MAX_SNIPPETS_PER_PAGE) continue;
    // A heading row matched by its words; show the passage under it, which says more than the heading does.
    const hash = r.url.split('#')[1];
    const snippet =
      r.type === 'heading' && hash
        ? ((await passageUnder(url, hash)) ?? toPlainText(r.content))
        : toPlainText(r.content);
    // A table repeats the same cell text on every row, and each row is a hit.
    if (!entry.snippets.includes(snippet)) entry.snippets.push(snippet);
  }

  // BM25 weighs a page's rows by length and counts, so a page named `Note` can rank below pages that mention
  // notes more densely. A query that is a page's name is a request for that page.
  const wanted = tokenizeSearchText(query, true).join(' ');
  const all = Array.from(byPage.values());
  const named = all.filter((h) => namesOf(h.url).includes(wanted));
  const hits = [...named, ...all.filter((h) => !named.includes(h))];
  const changelog = hits.findIndex((h) => h.url === CHANGELOG_URL);
  // Unless the reader asked about a release, the changelog goes after every other page.
  if (changelog !== -1 && !asksAboutARelease(query)) hits.push(...hits.splice(changelog, 1));

  return { hits: hits.slice(0, cap) };
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
