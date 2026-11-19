/**
 * The docs tools, implemented once.
 *
 * Search, page fetch (whole, or one section) and the topic list over the docs
 * corpus. Three surfaces adapt these plain functions: the MCP server
 * (`src/lib/mcp/tools.ts`), the JSON routes under `/api/docs/`
 * (`src/lib/docs-api.ts`) and the site's search box (`/api/search`). Search is
 * Fumadocs's Orama BM25, with the tokenizer below, over the same `source` that
 * powers `/llms.txt` and the `<path>.md` copy of each page, and `searchDocs`
 * reorders its pages by their titles, headings and kind. Dense embeddings
 * are deferred: BM25 alone needs no API key from self-hosters, and its recall
 * is good enough here.
 */

import { createFromSource } from 'fumadocs-core/search/server';
import { source, getLLMText, findPage } from '@/lib/source';
import pageLimits from '@/lib/page-limits.json';

/** Words a reader types around the one that matters. Dropped from a query, never from the index. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does', 'for', 'from', 'how',
  'i', 'if', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'so', 'that', 'the', 'this', 'to',
  'was', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
]);

/** A word, or words joined inside by a dot, hyphen or underscore: `print-token`, `next_cursor`, `core.note`. */
const WORD = /[\p{L}\p{N}]+(?:[._-][\p{L}\p{N}]+)*/gu;

/** A lowercase hyphenated name in an inline code span. */
const CODE_NAME = /`([a-z0-9]+(?:-[a-z0-9]+)+)`/g;

/** A command-line flag: `--force`, `--print-token`. */
const FLAG = /(?<![\p{L}\p{N}_-])--([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)/gu;

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
 *   a page that writes `Idempotency-Key`. It holds a dotted name (`core.note`,
 *   `webhooks.manage`), a code (`type_not_permitted`, `0.0.24`) and a lowercase
 *   hyphenated name in code (`webhook-poll`) only whole: the short row of a
 *   permission scope or a job name would outrank the pages about a word it
 *   holds. A flag is also a token of its own, `--force` beside `force`.
 * - A query holds the compound and, for a dotted name, its letter-only parts,
 *   so `core.task` finds the page about `task`, and for a hyphenated word its
 *   words, so `back-up` finds the page that writes `back up`. A hyphenated name
 *   in backticks stays whole. A code that no page writes, such as `NO_COLOR`,
 *   finds nothing instead of every page that says "no" or "color". A query also
 *   drops its stop words, unless nothing else is left.
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
  // A lowercase hyphenated name in code (`trash-purge`) is an identifier, so only whole: its short row would
  // outrank the pages about `trash` or `purge`.
  const identifiers = new Set(Array.from(text.matchAll(CODE_NAME), (m) => m[1]));
  // A flag is also its own token, `--scope` besides `scope`: a one-word flag is otherwise a word that
  // half the pages use, and `--force` could not find the page that explains it.
  const flagNames = new Set<string>();
  for (const flag of folded.matchAll(FLAG)) {
    flagNames.add(flag[1]);
    tokens.add(`--${flag[1].replace(/-/g, '_')}`);
  }
  const words: string[] = [];
  for (const match of folded.match(WORD) ?? []) {
    const parts = match.split(/[._-]/);
    if (parts.length === 1) {
      words.push(match);
      continue;
    }
    tokens.add(parts.join('_'));
    // Both hold a hyphenated name's words (`Idempotency-Key`, `back-up`), except a flag, which is its own token, and a
    // name in code. Only a query holds a dotted name's letter-only parts (`core.task` is `core` and `task`; `0.0.24`
    // is no number alone): the index does not, because a short row such as `webhooks.manage` would then outrank the
    // pages about webhooks. An underscore code's parts say nothing alone.
    const dotted = match.includes('.');
    if (match.includes('_') || (dotted && !forQuery) || flagNames.has(match) || identifiers.has(match)) continue;
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
  p = p.replace(/\.md$/i, '');
  p = p.replace(/\/+$/, '');
  // The landing page's Markdown copy is `/index.md`, as `slugsToMarkdownPath` writes it.
  if (p === '' || p === 'index') return [];
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

/**
 * A question only the changelog answers: its name, releases or release notes, the latest release, what changed or
 * is new, a breaking change or a version number. A bare `release` is not one: a held write has a release verdict.
 */
const ASKS_ABOUT_A_RELEASE =
  /\b(?:changelog|releases|release\s+notes?|latest\s+release|what(?:['\u2019]?s|\s+is)\s+new|what\s+changed|breaking|v?\d+\.\d+\.\d+)\b/i;

export function asksAboutARelease(query: string): boolean {
  return ASKS_ABOUT_A_RELEASE.test(query);
}

let namedPages: Map<string, { title: string; url: string }[]> | undefined;

/**
 * The pages a query names, found by what it must equal once tokenized: a page's title, or on a Catalog type
 * page its identifier (`core.task`). Built once, from every page, so a page named by a common word such as
 * `note` is found even when the word matches too many rows for it to be among the results.
 */
function pagesNamed(wanted: string): { title: string; url: string }[] {
  if (!namedPages) {
    namedPages = new Map();
    for (const page of source.getPages()) {
      const data = page.data as { title: string; identifier?: string };
      for (const name of [data.title, data.identifier]) {
        if (!name) continue;
        const key = tokenizeSearchText(name, true).join(' ');
        namedPages.set(key, [...(namedPages.get(key) ?? []), { title: data.title, url: page.url }]);
      }
    }
  }
  return namedPages.get(wanted) ?? [];
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

/**
 * Pages the ranking considers for a search, however few are asked for: a guide that BM25 puts tenth must be
 * able to come first once its title and headings are weighed.
 */
const CANDIDATE_PAGES = 30;

/** What each part of a page earns it, in places of rank, when a query's words are in it. A guide's title outranks a heading of another page. */
const TITLE_WEIGHT = 6;
/** On top of a title that holds the query's words and no others: `Make a key` for `make a key`. */
const EXACT_WEIGHT = 2;
/** What a heading that is the query's words earns its page, at most: under the smallest step between two kinds in `KIND_WEIGHT`, so a heading never lifts a page over one of a better kind. */
const HEADING_WEIGHT = 1.2;
const DESCRIPTION_WEIGHT = 1.5;
/** What a concept page earns for a question that asks what something is: `what is an item` wants the page that explains items, not a guide that names them. */
const CONCEPT_WEIGHT = 3;
/** A question that asks what something is, by its opening words, which the tokenizer drops as stop words. */
const ASKS_WHAT = /^\s*what(?:\s+(?:is|are)\b|['’]s\b)/iu;

/**
 * Where a page sits decides which of two equally matching pages a reader wants for a task: a Use or Run guide
 * before a Build page, before a Reference page, and a page for one API operation last. Taken from the folder
 * the page is in, so a new page needs nothing here.
 */
const KIND_WEIGHT = { guide: 5, build: 1.5, reference: 0, operation: -3 } as const;
type PageKind = keyof typeof KIND_WEIGHT;

/** A text's words as `coverage` and `exactly` compare them, built once so a query does not rebuild them for every page. */
interface TextProfile {
  /** The words, each as its singular. */
  have: Set<string>;
  /** Each pair of neighbouring words run together: `back` and `up` make `backup`. */
  joined: Set<string>;
  /** How many of the words are not stop words. */
  bare: number;
}

interface PageProfile {
  kind: PageKind;
  /** Whether the page explains an idea, the `concept` kind of `page-limits.json`. */
  concept: boolean;
  title: TextProfile;
  headings: TextProfile[];
  description: TextProfile;
}

let profiles: Promise<Map<string, PageProfile>> | undefined;

function kindOf(page: (typeof source)['$inferPage']): PageKind {
  // A generated operation page has no written body.
  if (!('getText' in page.data)) return 'operation';
  const folder = page.path.split('/')[0];
  // The Glossary and the Changelog are lookups, so they rank with the Reference; the rest of Home reads as guides.
  if (page.url === '/glossary' || page.url === '/changelog') return 'reference';
  if (folder === '(home)' || folder === 'use' || folder === 'run') return 'guide';
  return folder === 'build' ? 'build' : 'reference';
}

type Page = (typeof source)['$inferPage'];

/**
 * How two pages of equal standing are ordered, wherever BM25 or the ranking cannot tell them apart: the better kind
 * first (`KIND_WEIGHT`), then the title in code-unit order, then the address. It reads only what the page is, never
 * where it sits in the index or in a folder listing, so the same pages give the same order whatever the folders
 * are called.
 */
function comparePages(left: Page, right: Page): number {
  const kinds = KIND_WEIGHT[kindOf(right)] - KIND_WEIGHT[kindOf(left)];
  if (kinds !== 0) return kinds;
  const [a, b] = [left.data.title ?? '', right.data.title ?? ''];
  const titles = a < b ? -1 : a > b ? 1 : 0;
  if (titles !== 0) return titles;
  return left.url < right.url ? -1 : left.url > right.url ? 1 : 0;
}

/**
 * A BM25 score at the precision that counts. Two rows with the same terms can differ in the last digits of the
 * float, by the order the index summed its statistics in, so equal scores are compared after this rounding, which
 * is far finer than any real difference between pages.
 */
function scoreTier(score: number): number {
  return Math.round(score * 1e6);
}

type Row = [id: number, score: number, row: { page_id?: unknown }];

/**
 * The order Orama gives rows of equal BM25 score. Left alone it keeps the order the pages were indexed in, so the
 * pages that a search cuts off at its row limit, and the order of the rows of a tie, would depend on it. A row of a
 * better score goes first, then the row's page by `comparePages`, then the rows of one page in the order of its text.
 */
function compareRows(a: Row, b: Row): number {
  if (scoreTier(a[1]) !== scoreTier(b[1])) return scoreTier(b[1]) - scoreTier(a[1]);
  const left = typeof a[2].page_id === 'string' ? source.getPage(pathToSlugs(a[2].page_id)) : undefined;
  const right = typeof b[2].page_id === 'string' ? source.getPage(pathToSlugs(b[2].page_id)) : undefined;
  return (left && right ? comparePages(left, right) : 0) || a[0] - b[0];
}

/** `comparePages` for two addresses, or the address order for one that is no page. */
function compareUrls(a: string, b: string): number {
  const left = source.getPage(pathToSlugs(a));
  const right = source.getPage(pathToSlugs(b));
  return (left && right ? comparePages(left, right) : 0) || (a < b ? -1 : a > b ? 1 : 0);
}

/** Queries whose page scores `createSearchServer` keeps, oldest dropped first. */
const SCORED_QUERIES = 100;

/**
 * A search index over the given pages. `searchServer` indexes them in the loader's order; a test passes another order
 * to show the answer does not depend on it. Fumadocs returns rows without their BM25 scores, so the index also keeps
 * each page's best score for the query, in `pageScores`, which `searchDocs` needs to tell a tie from a lead.
 */
export function createSearchServer(getPages: () => Page[] = () => source.getPages()) {
  const scores = new Map<string, Map<string, number>>();
  const server = createFromSource({ ...source, getPages } as typeof source, {
    search: { sortBy: compareRows as never },
    plugins: [
      {
        name: 'page-scores',
        afterSearch: (_db, params, _language, results) => {
          if (!params.term) return;
          const pages = new Map<string, number>();
          for (const hit of results.hits) {
            const id = (hit.document as { page_id?: unknown }).page_id;
            if (typeof id === 'string' && !pages.has(id)) pages.set(id, hit.score);
          }
          scores.delete(params.term);
          scores.set(params.term, pages);
          if (scores.size > SCORED_QUERIES) scores.delete(scores.keys().next().value as string);
        },
      },
    ],
    tokenizer: {
      language: 'english',
      normalizationCache: new Map(),
      tokenize: (raw, _language, property) => tokenizeSearchText(raw, property === undefined),
    },
  });
  return Object.assign(server, {
    /** Each page's best BM25 score for a query that was just searched. */
    pageScores(query: string): Map<string, number> {
      const found = scores.get(query);
      if (!found) throw new Error(`The search index kept no scores for "${query}".`);
      return found;
    },
  });
}

/**
 * Built once per isolate rather than per request. Fumadocs builds the Orama
 * index lazily on first query and caches it against this instance. The site's
 * search box (`/api/search`) uses the same instance, so one cold start builds
 * one index.
 */
export const searchServer = createSearchServer();

/**
 * Whether a page is a concept page, known as `kindFor` in `page-limits.ts` knows it: the frontmatter's `kind`, then
 * the page's entry in `page-limits.json`, then the entry of the longest folder that holds it. A `fix-*` page is never
 * a concept.
 */
function isConcept(page: (typeof source)['$inferPage']): boolean {
  if ((page.path.split('/').pop() ?? '').startsWith('fix-')) return false;
  const declared = (page.data as { kind?: string }).kind;
  const pages: Record<string, object> = pageLimits.pages;
  const folders: Record<string, object> = pageLimits.folders;
  const kindIn = (entry: object | undefined) => (entry && 'kind' in entry ? entry.kind : undefined);
  const folder = Object.keys(folders)
    .filter((candidate) => page.path.startsWith(`${candidate}/`))
    .sort((a, b) => b.length - a.length)[0];
  return (declared ?? kindIn(pages[page.path]) ?? kindIn(folder ? folders[folder] : undefined)) === 'concept';
}

/** The index keeps a four-letter plural (`keys`) as it is, so that `cors` stays `cors`. Here a plural meets its singular. */
function singular(word: string): string {
  return word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
}

function profileText(text: string): TextProfile {
  const words = tokenizeSearchText(text, false);
  const one = words.map(singular);
  return {
    have: new Set(one),
    joined: new Set(one.slice(1).map((word, i) => one[i] + word)),
    bare: words.filter((word) => !STOP_WORDS.has(word)).length,
  };
}

function pageProfiles(): Promise<Map<string, PageProfile>> {
  profiles ??= (async () => {
    const map = new Map<string, PageProfile>();
    for (const page of source.getPages()) {
      const data = page.data as { title: string; description?: string; structuredData?: StructuredPage | (() => Promise<StructuredPage>) };
      const structured = typeof data.structuredData === 'function' ? await data.structuredData() : data.structuredData;
      map.set(page.url, {
        kind: kindOf(page),
        concept: isConcept(page),
        title: profileText(data.title),
        headings: (structured?.headings ?? []).map((h) => profileText(h.content)),
        description: profileText(data.description ?? ''),
      });
    }
    return map;
  })().catch((error) => {
    // A failed build must not be kept: every later search would fail with it.
    profiles = undefined;
    throw error;
  });
  return profiles;
}

/**
 * The share of a query's words that a text holds. Two words run together meet the same two apart, in either
 * direction (`backup` and `back up`), because readers write both and a page chooses one. `query` holds singulars.
 */
function coverage(query: string[], text: TextProfile): number {
  if (query.length === 0 || text.have.size === 0) return 0;
  const covered = new Set<number>();
  query.forEach((word, i) => {
    if (text.have.has(word) || text.joined.has(word)) covered.add(i);
    if (i + 1 < query.length && text.have.has(word + query[i + 1])) {
      covered.add(i);
      covered.add(i + 1);
    }
  });
  return covered.size / query.length;
}

/**
 * A query that names a code, a flag, a dotted name, a number or a version, so what a page is about does not decide
 * it. A hyphen, a full stop that ends a sentence and a small number such as the 2 of "2 computers" name nothing.
 */
const NAMES_AN_IDENTIFIER = /_|(?<![\p{L}\p{N}-])--\p{L}|\p{L}{2,}\.\p{L}{2,}|\d{3,}|\d+\.\d+/u;

export function namesAnIdentifier(query: string): boolean {
  return NAMES_AN_IDENTIFIER.test(query);
}

/**
 * Places of rank a page gains for how well its title, headings and description answer the query's words, and,
 * for a question that is not a code or a number, for being a guide. A question that asks what something is also
 * earns a concept page `CONCEPT_WEIGHT`. BM25 weighs a page's rows by their length and
 * counts, so a reference page that repeats a word outranks the guide that is about it. Headings add at most
 * `HEADING_WEIGHT`, less than a step between two kinds, so a heading never lifts a page over one of a better kind.
 */
function boost(profile: PageProfile, words: string[], task: boolean, asksWhat: boolean): number {
  const exactly = (text: TextProfile) => coverage(words, text) === 1 && text.bare === words.length;
  const heading = profile.headings.reduce((best, h) => Math.max(best, coverage(words, h)), 0);
  const headingExact = profile.headings.some(exactly);
  return (
    TITLE_WEIGHT * coverage(words, profile.title) ** 2 +
    (exactly(profile.title) ? EXACT_WEIGHT : 0) +
    HEADING_WEIGHT * (headingExact ? 1 : heading ** 2) +
    DESCRIPTION_WEIGHT * coverage(words, profile.description) ** 2 +
    (task ? KIND_WEIGHT[profile.kind] : 0) +
    (asksWhat && profile.concept ? CONCEPT_WEIGHT : 0)
  );
}

/** Full-text search, one hit per page. BM25 finds the pages, and the page's title, headings and place in the docs order them. */
export async function searchDocs(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
  server: typeof searchServer = searchServer,
): Promise<{ hits: SearchHit[] }> {
  if (!query.trim()) return { hits: [] };
  const cap = Math.min(Math.max(Math.trunc(limit), 1), MAX_SEARCH_LIMIT);

  const task = !namesAnIdentifier(query);
  const asksWhat = ASKS_WHAT.test(query);
  // A hyphenated word is two words for a reader asking for a task: `sign-in` is the `sign in` of the guide. Pages
  // that write it with the hyphen still rank first for the query as typed, so both are searched.
  const spaced = query.replace(/(?<=\p{L})-(?=\p{L})/gu, ' ');
  const searched = task && spaced !== query ? [query, spaced] : [query];

  // Pages beyond those asked for: the ranking below moves a page up, and the changelog can move from first
  // to last, so the page that takes its place must already be in the results.
  const lists = await Promise.all(
    searched.map((q) => server.search(q, { limit: Math.max(cap + 1, CANDIDATE_PAGES) * ROWS_PER_PAGE })),
  );

  // Orama returns one row per heading or text fragment. Fold the rows of a page into one candidate. A page's rank is
  // its place in the list of pages by BM25 score, best of the searches; pages that tie on score share the middle of
  // the places they hold, so the order the index happens to give them decides nothing.
  const rowsByPage = new Map<string, Awaited<(typeof lists)[number]>>();
  const rankOf = new Map<string, number>();
  lists.forEach((results, i) => {
    const scores = server.pageScores(searched[i]);
    const pages = [...new Set(results.map((r) => r.url.split('#')[0]))];
    const tiers = pages.map((url) => scoreTier(scores.get(url) ?? Number.NaN));
    for (let first = 0, last = 0; first < pages.length; first = last + 1) {
      for (last = first; last + 1 < pages.length && tiers[last + 1] === tiers[first]; ) last++;
      for (let at = first; at <= last; at++) {
        rankOf.set(pages[at], Math.min(rankOf.get(pages[at]) ?? Infinity, (first + last) / 2));
      }
    }
    for (const r of results) {
      const url = r.url.split('#')[0];
      const rows = rowsByPage.get(url) ?? [];
      if (!rows.some((row) => row.url === r.url && row.content === r.content)) rowsByPage.set(url, [...rows, r]);
    }
  });

  // BM25 puts a page in the results; the page's own words and kind then order them. A tie in place goes to the better BM25 rank, and a tie in that to `comparePages`.
  const words = tokenizeSearchText(query, true);
  const rankWords = tokenizeSearchText(task ? spaced : query, true).map(singular);
  const known = await pageProfiles();
  const ranked = [...rankOf]
    .map(([url, rank]) => {
      const profile = known.get(url);
      return { url, rank, place: rank - (profile ? boost(profile, rankWords, task, asksWhat) : 0) };
    })
    .sort((a, b) => a.place - b.place || a.rank - b.rank || compareUrls(a.url, b.url))
    .map((c) => c.url);

  // A query that is a page's name is a request for that page, however many pages repeat the word. Where a guide
  // and a reference page share the name, the ranking above says which comes first, and for a task a page of a
  // worse kind than the best-ranked page is not lifted over it: "restore a backup" is the guide, not the operation.
  const topKind = known.get(ranked[0])?.kind;
  const named = pagesNamed(words.join(' '))
    .map((p) => p.url)
    .filter((url) => !task || !topKind || KIND_WEIGHT[known.get(url)?.kind ?? 'reference'] >= KIND_WEIGHT[topKind]);
  const first = [...ranked.filter((url) => named.includes(url)), ...named.filter((url) => !ranked.includes(url))];
  const order = [...first, ...ranked.filter((url) => !named.includes(url))];
  const changelog = order.indexOf(CHANGELOG_URL);
  if (changelog !== -1) {
    // The changelog repeats every term, so it goes after every other page, unless the reader asked about a
    // release: then it goes first, ahead of a page that only uses the word.
    const [page] = order.splice(changelog, 1);
    if (asksAboutARelease(query)) order.unshift(page);
    else order.push(page);
  }

  const hits: SearchHit[] = [];
  for (const url of order.slice(0, cap)) {
    const page = source.getPage(pathToSlugs(url));
    const rows = rowsByPage.get(url) ?? [];
    const entry: SearchHit = {
      url,
      title:
        page?.data.title ??
        toPlainText(
          rows[0]?.type === 'page' || !Array.isArray(rows[0]?.breadcrumbs) || rows[0].breadcrumbs.length === 0
            ? (rows[0]?.content ?? '')
            : rows[0].breadcrumbs[0],
        ),
      snippets: [],
    };
    for (const r of rows) {
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
    hits.push(entry);
  }
  return { hits };
}

/** The page's Markdown, the same text its `<path>.md` copy serves, or `null` when there is no such page. */
export async function fetchDocsPage(path: string): Promise<string | null> {
  const page = findPage(pathToSlugs(path));
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
