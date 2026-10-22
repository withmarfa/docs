import { describe, expect, it } from 'vitest';
import { searchDocs, tokenizeSearchText } from './docs-tools';
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
    // The CLI reads no NO_COLOR variable, so no page may say it does.
    expect(await searchDocs('NO_COLOR')).toEqual({ hits: [] });
  });
});

describe('tokenizeSearchText', () => {
  it('reads a flag, a hyphenated name and a code as the same token however it is written', () => {
    expect(tokenizeSearchText('`--print-token`', false)).toContain('print_token');
    expect(tokenizeSearchText('--print-token', true)).toEqual(['print_token']);
    expect(tokenizeSearchText('Print-Token', true)).toEqual(['print_token']);
    expect(tokenizeSearchText('next_cursor', true)).toEqual(['next_cursor']);
    expect(tokenizeSearchText('core.note', true)).toEqual(['core_note']);
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
});

describe('ranking', () => {
  it('puts the changelog after every other page, unless the query names it', async () => {
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
