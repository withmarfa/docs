import { describe, expect, it } from 'vitest';
import { asksAboutARelease, searchDocs, tokenizeSearchText, trimPassage } from './docs-tools';
import { source } from '@/lib/source';

/**
 * Each row is a query a reader or an agent might type, and the page or pages
 * that answer it. A query passes when one of its pages is among the first three
 * hits. A row lists more than one page only where more than one page really
 * answers the query; a row with one page pins that page.
 *
 * A failure here means a page dropped out of the first three for a query a
 * reader types. Fix the page (name the idea in plain words where it is
 * explained) or the tuning in `docs-tools.ts`, and change a row only when the
 * answer to the query has moved to another page.
 */
const EXPECTED: [query: string, pages: string[]][] = [
  // Ideas an outside reader names differently from the docs.
  ['optimistic concurrency', ['/versions']],
  ['etag', ['/versions']],
  ['If-Match header', ['/versions']],
  ['412 precondition', ['/versions']],
  ['timestamps', ['/items-and-types']],
  ['delete vs purge', ['/items-and-types']],
  ['soft delete trash', ['/items-and-types']],

  // Errors, headers and writes.
  ['409', ['/api-reference/errors']],
  ['version_conflict', ['/api-reference/errors', '/guides/write-safely']],
  ['type_not_permitted', ['/api-reference/errors']],
  ['unauthorized', ['/api-reference/errors']],
  ['idempotency key', ['/guides/write-safely']],
  ['retry a write safely', ['/guides/write-safely']],
  [
    'rate limit 429',
    ['/guides/troubleshooting', '/guides/folder-safeguards', '/guides/connector-holds-and-retries', '/guides/settings'],
  ],
  ['retry-after', ['/guides/connector-webhooks', '/guides/connector-holds-and-retries', '/guides/keep-in-sync']],
  ['CORS', ['/guides/settings']],

  // Reading and listing.
  ['pagination cursor', ['/api-reference', '/guides/list-filter-search']],
  ['next_cursor', ['/guides/list-filter-search', '/api-reference']],
  ['list items by tag', ['/guides/list-filter-search']],
  ['filter items by property', ['/guides/list-filter-search']],

  // Webhooks and connectors.
  ['webhook signature', ['/guides/connector-webhooks', '/guides/receive-webhooks']],
  ['hmac', ['/guides/receive-webhooks']],

  // Sign-in, keys and the command line.
  ['oauth device flow', ['/guides/authenticate']],
  ['marfa login', ['/cli']],
  ['create type scaffold', ['/cli', '/guides/define-a-type']],
  ['MARFA_API_KEY', ['/cli', '/guides/manage-keys']],
  ['rotate a key', ['/guides/manage-keys']],
  ['passkey', ['/guides/sign-in-as-the-owner']],
  ['json output', ['/cli']],
  ['exit code 5', ['/cli']],
  ['print-token', ['/cli']],
  ['--print-token', ['/cli']],

  // Running an instance.
  ['environment variables', ['/guides/settings']],
  ['docker compose', ['/guides/install', '/guides/deploy']],
  ['litestream', ['/guides/deploy', '/guides/back-up-and-restore']],
  ['s3 bucket', ['/guides/settings', '/guides/deploy', '/guides/install', '/guides/back-up-and-restore']],
  ['upgrade server', ['/guides/upgrade']],
  ['change instance name', ['/guides/settings']],
  ['install marfa on linux', ['/cli', '/guides/install', '/quickstart']],
  ['how do I back up my data', ['/guides/back-up-and-restore', '/guides/export-and-restore']],
  ['restore', ['/guides/back-up-and-restore', '/guides/export-and-restore']],

  // Files.
  ['blob upload', ['/guides/handle-files', '/api-reference/blobs/uploadBlob']],
  ['attach a file to a note', ['/guides/handle-files']],

  // A dotted type key, and a word that is the end of one.
  ['core.task', ['/catalog/task']],
  ['note', ['/catalog/note']],
  ['core.note', ['/catalog/note']],

  // A flag that is also an ordinary word, and a word that starts a permission scope (`webhooks.manage`).
  ['--force', ['/guides/define-a-type']],
  ['--scope', ['/docs-mcp-server']],
  ['webhooks', ['/events', '/guides/receive-webhooks']],
  ['audit', ['/guides/audit-log']],

  // An apostrophe is part of a word, not a break in it.
  ["can't overwrite", ['/guides/ai-agents', '/guides/export-and-restore']],
];

/**
 * Queries that ask about a release. The changelog answers them, so it is not
 * moved to the end of the results: it comes first.
 */
const RELEASE_QUERIES = [
  'what is new in marfa',
  'latest release',
  '0.0.24',
  'v0.0.24',
  'version 0.0.24',
  'release notes',
  'what changed in 0.0.25',
  'breaking changes',
];

describe('search finds the page that answers a query', () => {
  it.each(EXPECTED)('%s', async (query, pages) => {
    const { hits } = await searchDocs(query);
    const top = hits.slice(0, 3).map((h) => h.url);
    expect(
      top.some((url) => pages.includes(url)),
      `${query}: wanted one of ${pages.join(', ')}; got ${top.join(', ') || 'nothing'}`,
    ).toBe(true);
  });

  it('finds nothing for a code no page uses, instead of every page with "no" or "color"', async () => {
    // The CLI reads no MARFA_NO_COLOR variable (it reads NO_COLOR), so no page
    // may say it does.
    expect(await searchDocs('MARFA_NO_COLOR')).toEqual({ hits: [] });
  });
});

describe('a query about a release finds the changelog', () => {
  it.each(RELEASE_QUERIES)('%s', async (query) => {
    const top = (await searchDocs(query)).hits.slice(0, 3).map((h) => h.url);
    expect(top[0], `${query}: the changelog is not first; got ${top.join(', ') || 'nothing'}`).toBe('/changelog');
  });
});

describe('asksAboutARelease', () => {
  it('is true for the changelog, a release, a change or a version number', () => {
    for (const query of ['changelog', 'release notes', 'swift sdk releases', 'latest release', 'what is new in marfa', 'what changed in 0.0.25', "what's new", 'what’s new', 'breaking changes', 'version 0.0.24', '0.0.24', 'v0.0.24']) {
      expect(asksAboutARelease(query), query).toBe(true);
    }
  });

  it('is false for a query about a page, so the changelog still ranks last there', () => {
    for (const query of ['release a hold', 'release', 'notes', 'rotate a key', 'version_conflict', 'versions', 'core.note', '429', 'exit code 5', 'upgrade server']) {
      expect(asksAboutARelease(query), query).toBe(false);
    }
  });
});

describe('a query that names a page', () => {
  it('shows that page first, by its title or its identifier', async () => {
    expect((await searchDocs('note')).hits[0].url).toBe('/catalog/note');
    expect((await searchDocs('core.task')).hits[0].url).toBe('/catalog/task');
    expect((await searchDocs('versions')).hits[0].url).toBe('/versions');
  });
});

describe('tokenizeSearchText', () => {
  it('reads a flag, a hyphenated name and a code as the same token however it is written', () => {
    expect(tokenizeSearchText('`--print-token`', false)).toContain('print_token');
    expect(tokenizeSearchText('--print-token', true)).toEqual(['--print_token', 'print_token']);
    expect(tokenizeSearchText('Print-Token', true)).toEqual(['print_token']);
    expect(tokenizeSearchText('next_cursor', true)).toEqual(['next_cursor']);
    expect(tokenizeSearchText('core.note', true)).toEqual(['core_note', 'core', 'note']);
  });

  it('holds a flag as its own token as well as its words, so a one-word flag is not just a word', () => {
    expect(tokenizeSearchText('marfa export --force', false)).toEqual(expect.arrayContaining(['--force', 'force']));
    expect(tokenizeSearchText('--s3-prefix', false)).toEqual(expect.arrayContaining(['--s3_prefix', 's3_prefix']));
    // A hyphen before a word is not a flag.
    expect(tokenizeSearchText('a --- b, well-known', false)).not.toContain('--well_known');
  });

  it('indexes a hyphenated name and its words, and a code only whole', () => {
    expect(tokenizeSearchText('Idempotency-Key', false)).toEqual(expect.arrayContaining(['idempotency_key', 'idempotency', 'key']));
    expect(tokenizeSearchText('type_not_permitted', false)).toEqual(['type_not_permitted']);
  });

  it('queries a code whole, so one that no page uses matches nothing', () => {
    expect(tokenizeSearchText('NO_COLOR', true)).toEqual(['no_color']);
  });

  it('drops stop words from a query, and keeps them when nothing else is left', () => {
    expect(tokenizeSearchText('how do I back up my data', true)).toEqual(['back', 'up', 'data']);
    expect(tokenizeSearchText('the', true)).toEqual(['the']);
    expect(tokenizeSearchText('the', false)).toEqual(['the']);
  });

  it('folds a plural to its singular, and leaves a short word and a code alone', () => {
    expect(tokenizeSearchText('items', true)).toEqual(['item']);
    expect(tokenizeSearchText('properties', true)).toEqual(['property']);
    expect(tokenizeSearchText('status', true)).toEqual(['status']);
    // `cors` stemmed to `cor` would prefix-match every `correct`.
    expect(tokenizeSearchText('CORS', true)).toEqual(['cors']);
    expect(tokenizeSearchText('429', true)).toEqual(['429']);
  });

  it('ignores accents and case', () => {
    expect(tokenizeSearchText('Café', true)).toEqual(['cafe']);
  });

  it('keeps a word with an apostrophe whole, so no one-letter token prefix-matches every word', () => {
    expect(tokenizeSearchText("what's new", true)).toEqual(['new']);
    expect(tokenizeSearchText("can’t overwrite", true)).toEqual(['cant', 'overwrite']);
    expect(tokenizeSearchText("the owner's key", false)).toEqual(expect.arrayContaining(['owner', 'key']));
    for (const text of ["what's new", "can't overwrite", "doesn't", "owner's"]) {
      for (const forQuery of [true, false]) {
        for (const token of tokenizeSearchText(text, forQuery)) expect(token.length, `${text}: "${token}"`).toBeGreaterThan(1);
      }
    }
  });

  it('queries the letter-only parts of a dotted name as well as the whole, and not its numbers', () => {
    expect(tokenizeSearchText('core.task', true)).toEqual(['core_task', 'core', 'task']);
    expect(tokenizeSearchText('0.0.24', true)).toEqual(['0_0_24']);
  });

  it('indexes a dotted name and a hyphenated identifier in code only whole', () => {
    // `webhooks.manage` is one short row; its parts would outrank the pages about webhooks.
    expect(tokenizeSearchText('`webhooks.manage`', false)).toEqual(['webhooks_manage']);
    expect(tokenizeSearchText('`webhook-poll`', false)).toEqual(['webhook_poll']);
    // A header name and a hyphenated word in prose keep their words.
    expect(tokenizeSearchText('the `Idempotency-Key` header', false)).toContain('idempotency');
    expect(tokenizeSearchText('a command-line app', false)).toContain('command');
  });

  it('reads a version the same with or without its v', () => {
    expect(tokenizeSearchText('v0.0.24', false)).toEqual(tokenizeSearchText('0.0.24', false));
    expect(tokenizeSearchText('v0.0.24', true)).toEqual(tokenizeSearchText('0.0.24', true));
    // Only a version loses its v.
    expect(tokenizeSearchText('video', true)).toEqual(['video']);
    expect(tokenizeSearchText('v2', true)).toEqual(['v2']);
  });
});

describe('trimmed passages', () => {
  it('are cut at a word, not to one character', () => {
    // No space in the first 240 characters.
    const long = `${'a'.repeat(300)} tail`;
    const trimmed = trimPassage(long);
    expect(trimmed.length).toBeGreaterThan(100);
    expect(trimmed.endsWith('...')).toBe(true);
    expect(trimPassage('short passage')).toBe('short passage');
  });

  it('do not end inside bold or code', () => {
    const base = 'word '.repeat(47);
    const short = 'word '.repeat(30);
    for (const open of ['**', '`']) {
      const trimmed = trimPassage(`${base}${open}the files stay where they are, as long as they like ${open}and more words follow here`);
      expect(trimmed.replace(/\.\.\.$/, '').trimEnd(), trimmed).not.toMatch(/(\*\*|`)[^*`]*$/);
    }
    // A closed pair is left alone.
    expect(trimPassage(`${short}**bold** and more words follow here for a long while yet, enough to pass the limit, and then a good deal more, past it`)).toContain('**bold**');
  });
});

describe('ranking', () => {
  it('puts the changelog after every other page, unless the query asks about a release', async () => {
    for (const [query] of EXPECTED) {
      const { hits } = await searchDocs(query, 20);
      const at = hits.findIndex((h) => h.url === '/changelog');
      if (at !== -1) expect(at, `${query}: the changelog is not last`).toBe(hits.length - 1);
    }
    expect((await searchDocs('changelog')).hits[0].url).toBe('/changelog');
  });

  it('still returns the changelog, last, when it is one of the pages that match', async () => {
    const { hits } = await searchDocs('tombstone', 50);
    expect(hits.length).toBeGreaterThan(1);
    expect(hits[hits.length - 1].url).toBe('/changelog');
  });
});

describe('snippets', () => {
  const headingsOf = async (url: string) => {
    const page = source.getPage(url.split('/').filter(Boolean));
    const data = page?.data as { structuredData?: { headings: { content: string }[] } | (() => Promise<{ headings: { content: string }[] }>) };
    const structured = typeof data?.structuredData === 'function' ? await data.structuredData() : data?.structuredData;
    return new Set((structured?.headings ?? []).map((h) => h.content));
  };

  it('show a passage, not a heading', async () => {
    for (const query of ['rotate a key', 'idempotency key', 'retry a write safely', 'filter items by property', 'oauth device flow']) {
      const { hits } = await searchDocs(query, 5);
      for (const hit of hits) {
        const headings = await headingsOf(hit.url);
        for (const snippet of hit.snippets) {
          expect(headings.has(snippet), `${query}: ${hit.url} shows the heading "${snippet}" as a snippet`).toBe(false);
        }
      }
    }
  });

  it('say something about the match, in a short passage', async () => {
    const { hits } = await searchDocs('rotate a key');
    const keys = hits.find((h) => h.url === '/guides/manage-keys')!;
    expect(keys.snippets[0]).not.toBe('Rotate a key');
    expect(keys.snippets[0].length).toBeGreaterThan(30);
    for (const hit of hits) for (const snippet of hit.snippets) expect(snippet.length).toBeLessThanOrEqual(400);
  });
});

describe('the answer keeps its shape', () => {
  it('is { hits: [{ title, url, snippets }] } and nothing more, because `marfa docs` reads it', async () => {
    const result = await searchDocs('housekeeping');
    expect(Object.keys(result)).toEqual(['hits']);
    for (const hit of result.hits) {
      expect(Object.keys(hit).sort()).toEqual(['snippets', 'title', 'url']);
      expect(typeof hit.title).toBe('string');
      expect(hit.url.startsWith('/')).toBe(true);
      expect(Array.isArray(hit.snippets)).toBe(true);
    }
  });
});
