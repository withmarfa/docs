import { describe, expect, it } from 'vitest';
import { asksAboutARelease, createSearchServer, MAX_SEARCH_LIMIT, namesAnIdentifier, searchDocs, tokenizeSearchText, trimPassage } from './docs-tools';
import changelog from '@/generated/changelog.json';
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
  ['optimistic concurrency', ['/build/versions']],
  ['etag', ['/build/versions']],
  ['If-Match header', ['/build/versions']],
  ['412 precondition', ['/build/versions']],
  ['timestamps', ['/build/items-and-types']],
  ['delete vs purge', ['/build/items-and-types']],
  ['soft delete trash', ['/build/items-and-types']],

  // Errors, headers and writes.
  ['409', ['/reference/errors']],
  ['version_conflict', ['/reference/errors', '/build/write-safely']],
  ['type_not_permitted', ['/reference/errors']],
  ['unauthorized', ['/reference/errors']],
  ['idempotency key', ['/build/write-safely']],
  ['retry a write safely', ['/build/write-safely']],
  [
    'rate limit 429',
    ['/run/troubleshooting/credentials-and-access', '/reference/folder-rules', '/build/connector-without-the-kit', '/run/settings'],
  ],
  ['retry-after', ['/build/connector-without-the-kit', '/build/keep-in-sync']],
  ['CORS', ['/run/settings', '/reference/instance-settings']],

  // Reading and listing.
  ['pagination cursor', ['/reference/api', '/build/list-filter-search']],
  ['next_cursor', ['/build/list-filter-search', '/reference/api']],
  ['list items by tag', ['/build/list-filter-search', '/use/command-line']],
  ['filter items by property', ['/build/list-filter-search']],

  // Webhooks and connectors.
  ['webhook signature', ['/build/connector-without-the-kit', '/build/receive-webhooks']],
  ['hmac', ['/build/receive-webhooks']],

  // Sign-in, keys and the command line.
  ['oauth device flow', ['/build/connect-an-app']],
  ['marfa login', ['/reference/cli', '/run/sign-in-as-the-owner', '/run/troubleshooting/credentials-and-access']],
  ['create type scaffold', ['/reference/cli', '/build/define-a-type']],
  ['MARFA_API_KEY', ['/reference/cli', '/use/manage-keys']],
  ['rotate a key', ['/use/manage-keys']],
  ['passkey', ['/run/sign-in-as-the-owner']],
  ['json output', ['/reference/cli', '/use/command-line']],
  // Exit code 5 is a missing or refused credential, which the fix page for a refused key answers too.
  ['exit code 5', ['/reference/cli', '/run/troubleshooting/credentials-and-access']],
  ['print-token', ['/reference/cli']],
  ['--print-token', ['/reference/cli']],

  ['edge type', ['/build/edges', '/catalog/edges']],
  ['edge_cycle', ['/build/edges', '/reference/errors']],

  // Running an instance.
  ['environment variables', ['/run/settings', '/reference/instance-settings']],
  ['docker compose', ['/run/install', '/run/run-on-a-server']],
  ['back up to a bucket', ['/run/back-up-and-restore']],
  ['s3 bucket', ['/run/settings', '/reference/instance-settings', '/run/run-on-a-server', '/run/install', '/run/back-up-and-restore']],
  ['upgrade server', ['/run/upgrade']],
  ['folders autostart', ['/use/keep-folders-syncing']],
  ['watch key file', ['/use/keep-folders-syncing']],
  ['change instance name', ['/run/settings']],
  ['install marfa on linux', ['/reference/cli', '/run/install', '/quickstart']],
  ['how do I back up my data', ['/run/back-up-and-restore', '/run/export-and-restore']],
  ['restore', ['/run/back-up-and-restore', '/run/export-and-restore']],

  // Files.
  ['blob upload', ['/build/files-upload-download', '/reference/api/blobs/uploadBlob']],
  ['attach a file to a note', ['/build/files-upload-download']],

  // A dotted type key, and a word that is the end of one.
  ['core.task', ['/catalog/task']],
  ['note', ['/catalog/note']],
  ['core.note', ['/catalog/note']],

  // A flag that is also an ordinary word, and a word that starts a permission scope (`webhooks.manage`).
  ['--force', ['/build/change-a-type']],
  ['--scope', ['/reference/docs-mcp-server']],
  ['webhooks', ['/build/events', '/build/receive-webhooks']],
  ['audit', ['/use/audit-log']],

  // An apostrophe is part of a word, not a break in it.
  // `/use/from-an-agent` says an agent reads before it writes but never says "overwrite", so the pages that do answer come first.
  ["can't overwrite", ['/build/versions', '/build/write-safely']],

  // A question in a reader's own words, answered by one of the pages that explains it.
  ['install the cli', ['/reference/cli', '/quickstart']],
  ['tables', ['/build/tables', '/catalog/table']],
  ['edge types', ['/build/edges', '/catalog/edges']],
  ['permissions', ['/catalog/permissions', '/build/access']],
];

/**
 * Queries a reader brings as a task or a name, and the page that must come first: the guide for the task, not a
 * reference page, an SDK page or the page for one API operation that repeats the word. A query passes when its
 * first hit is one of its pages.
 */
const FIRST: [query: string, pages: string[]][] = [
  ['backup', ['/run/back-up-and-restore']],
  ['back up', ['/run/back-up-and-restore']],
  // A hyphen or a small number is not a code, so the guide still comes first; `/reference/swift-sdk` has a heading "Sign in" and the
  // `restoreBackup` operation answers "restore from backup", but a reader asking for a task wants the guide.
  ['back-up', ['/run/back-up-and-restore']],
  ['restore from backup', ['/run/back-up-and-restore']],
  ['sign in', ['/run/sign-in-as-the-owner']],
  ['how do I sign in', ['/run/sign-in-as-the-owner']],
  ['sign-in', ['/run/sign-in-as-the-owner']],
  ['set-up', ['/quickstart', '/run/address', '/run/upgrade', '/use/google-project']],
  ['sync a folder on 2 computers', ['/use/sync-a-folder']],
  ['sync a folder on another computer', ['/use/sync-a-folder']],
  ['install', ['/run/install']],
  ['sync a folder', ['/use/sync-a-folder']],
  ['second computer', ['/use/sync-a-folder']],
  ['conflicted copy', ['/use/conflicts']],
  // No command pauses one folder yet, and the page that says what to do instead is the one to find.
  ['pause a folder', ['/use/change-or-stop-a-folder']],
  ['what is an item', ['/how-marfa-works']],
  ['connect claude', ['/connect-your-agent', '/connect-your-agent']],
  ['chatgpt', ['/connect-your-agent']],
  ['upgrade', ['/run/upgrade']],
  ['make a key', ['/use/manage-keys']],
  ['narrow a key', ['/use/manage-keys']],
  ['get help', ['/get-help']],
  // The top-bar page for a reader with a problem ranks as a guide, as when it sat in Use, over the pages that repeat its words.
  ['report a bug', ['/get-help']],
  ['report a security issue', ['/get-help']],
  ['ask a question', ['/get-help']],
  ['limits', ['/use/limits']],
  ['errors', ['/reference/errors']],
  ['webhooks', ['/build/receive-webhooks']],
];

/**
 * Queries that ask about a release. The changelog answers them, so it is not
 * moved to the end of the results: it comes first.
 */
const RELEASE_QUERIES = [
  'what is new in marfa',
  'latest release',
  'release notes',
  'breaking changes',
];

/** A query by version number, which only the page's releases can answer, so it exists once a release has been synced. */
const releaseTag = (changelog as { tag: string }[])[0]?.tag;
const VERSION_QUERIES = releaseTag ? [releaseTag, releaseTag.slice(1), `version ${releaseTag.slice(1)}`, `what changed in ${releaseTag.slice(1)}`] : [];

describe('search finds the page that answers a query', () => {
  it.each(EXPECTED)('%s', async (query, pages) => {
    const { hits } = await searchDocs(query);
    const top = hits.slice(0, 3).map((h) => h.url);
    expect(
      top.some((url) => pages.includes(url)),
      `${query}: wanted one of ${pages.join(', ')}; got ${top.join(', ') || 'nothing'}`,
    ).toBe(true);
  });

  it.each(FIRST)('%s comes first', async (query, pages) => {
    const top = (await searchDocs(query)).hits.slice(0, 3).map((h) => h.url);
    expect(pages, `${query}: wanted ${pages.join(' or ')} first; got ${top.join(', ') || 'nothing'}`).toContain(top[0]);
  });

  it('finds nothing for a code no page uses, instead of every page with "no" or "color"', async () => {
    // The CLI reads no MARFA_NO_COLOR variable (it reads NO_COLOR), so no page
    // may say it does.
    expect(await searchDocs('MARFA_NO_COLOR')).toEqual({ hits: [] });
  });
});

describe('a query about a release finds the changelog', () => {
  it.each([...RELEASE_QUERIES, ...VERSION_QUERIES])('%s', async (query) => {
    // The widest search: the page has only its introduction until a release is synced, and the search must still reach it.
    const top = (await searchDocs(query, MAX_SEARCH_LIMIT)).hits.slice(0, 3).map((h) => h.url);
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

describe('namesAnIdentifier', () => {
  it('is true for a code, a flag, a dotted name and a number of three digits or a version', () => {
    for (const query of ['MARFA_API_KEY', 'type_not_permitted', 'next_cursor', '--force', 'marfa export --scope', 'core.task', 'webhooks.manage', '429', 'exit code 404', '0.0.24', 'v0.0.24']) {
      expect(namesAnIdentifier(query), query).toBe(true);
    }
  });

  it('is false for words, whatever hyphen, one-digit number or full stop is among them', () => {
    for (const query of ['sign-in', 'set-up', 'read-only', 'self-hosted', 'sync a folder on 2 computers', 'exit code 5', 'back-up', 'e.g. a note', 'install.', 'a well-known --- dash', 'Idempotency-Key']) {
      expect(namesAnIdentifier(query), query).toBe(false);
    }
  });
});

describe('a hyphenated word finds what the same two words do', () => {
  it.each([['sign-in', 'sign in'], ['back-up', 'back up'], ['set-up', 'set up']])('%s is %s', async (hyphenated, spaced) => {
    const a = (await searchDocs(hyphenated)).hits.slice(0, 3).map((h) => h.url);
    const b = (await searchDocs(spaced)).hits.slice(0, 3).map((h) => h.url);
    expect(a.length, hyphenated).toBeGreaterThan(0);
    expect(a[0], `${hyphenated}: ${a.join(', ')}; ${spaced}: ${b.join(', ')}`).toBe(b[0]);
  });

  it('still finds a hyphenated name in code by the name', async () => {
    for (const [query, page] of [['`parent-of`', '/catalog/edges/parent-of'], ['`trash-purge`', undefined], ['parent-of', '/catalog/edges/parent-of']] as const) {
      const top = (await searchDocs(query)).hits.slice(0, 3).map((h) => h.url);
      if (page) expect(top, query).toContain(page);
      else expect(top.length, query).toBeGreaterThan(0);
    }
  });
});

describe('a query that names a page', () => {
  it('shows that page first, by its title or its identifier', async () => {
    expect((await searchDocs('note')).hits[0].url).toBe('/catalog/note');
    expect((await searchDocs('core.task')).hits[0].url).toBe('/catalog/task');
    expect((await searchDocs('versions')).hits[0].url).toBe('/build/versions');
  });
});

describe('tokenizeSearchText', () => {
  it('reads a flag, a hyphenated name and a code as the same token however it is written', () => {
    expect(tokenizeSearchText('`--print-token`', false)).toContain('print_token');
    expect(tokenizeSearchText('--print-token', true)).toEqual(['--print_token', 'print_token']);
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

  it('queries a hyphenated word whole and as its words, unless it is in code', () => {
    expect(tokenizeSearchText('back-up', true)).toEqual(['back_up', 'back', 'up']);
    expect(tokenizeSearchText('Print-Token', true)).toEqual(['print_token', 'print', 'token']);
    expect(tokenizeSearchText('webhook-poll', true)).toEqual(['webhook_poll', 'webhook', 'poll']);
    expect(tokenizeSearchText('`webhook-poll`', true)).toEqual(['webhook_poll']);
    // A stop word among the parts is dropped, as it is from a query of separate words.
    expect(tokenizeSearchText('parent-of', true)).toEqual(['parent_of', 'parent']);
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

describe('ties', () => {
  /** A repeatable shuffle (Fisher-Yates over a small seeded generator), so a failure can be run again. */
  function shuffled<T>(items: T[], seed: number): T[] {
    const out = [...items];
    let state = seed;
    const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  it('are decided by the page, not by the order the pages were indexed in', async () => {
    const pages = source.getPages();
    const queries = [...new Set([...EXPECTED, ...FIRST].map(([query]) => query)), 'note', 'sign in', 'item', 'key', 'what is an item'];
    const wanted = await Promise.all(queries.map((query) => searchDocs(query, 20)));
    for (const seed of [1, 2, 3]) {
      const server = createSearchServer(() => shuffled(pages, seed));
      for (const [i, query] of queries.entries()) {
        const { hits } = await searchDocs(query, 20, server);
        expect(
          hits.map((h) => h.url),
          `${query}: the hits changed when the pages were indexed in another order (seed ${seed})`,
        ).toEqual(wanted[i].hits.map((h) => h.url));
      }
    }
  }, 60_000);
});

describe('ranking', () => {
  it('puts the changelog after every other page, unless the query asks about a release', async () => {
    for (const [query] of [...EXPECTED, ...FIRST]) {
      const { hits } = await searchDocs(query, 20);
      const at = hits.findIndex((h) => h.url === '/changelog');
      if (at !== -1) expect(at, `${query}: the changelog is not last`).toBe(hits.length - 1);
    }
    expect((await searchDocs('changelog')).hits[0].url).toBe('/changelog');
  });

  it('still returns the changelog, last, when it is one of the pages that match', async () => {
    const { hits } = await searchDocs('upgrade', 50);
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
    const keys = hits.find((h) => h.url === '/use/manage-keys')!;
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
