import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  MAX_SNIPPETS_PER_PAGE,
  extractSection,
  fetchDocsPage,
  fetchDocsSection,
  listHeadings,
  listTopics,
  pathToSlugs,
  searchDocs,
} from './docs-tools';

describe('searchDocs', () => {
  it('folds a page and its matching fragments into one hit', async () => {
    const { hits } = await searchDocs('housekeeping');
    expect(hits.length).toBeGreaterThan(0);

    const urls = hits.map((h) => h.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.filter((u) => u === '/run/housekeeping')).toHaveLength(1);
    for (const hit of hits) {
      expect(hit.url).not.toContain('#');
      expect(hit.snippets.length).toBeLessThanOrEqual(MAX_SNIPPETS_PER_PAGE);
    }

    const page = hits.find((h) => h.url === '/run/housekeeping')!;
    expect(page.title).toBe('Housekeeping');
    expect(page.snippets.length).toBeGreaterThan(0);
  });

  it('returns plain text, with no highlight markup in titles or snippets', async () => {
    for (const query of ['housekeeping', 'the', 'item version']) {
      const { hits } = await searchDocs(query, 20);
      for (const text of hits.flatMap((h) => [h.title, ...h.snippets])) {
        expect(text, query).not.toMatch(/<\/?mark>/);
      }
    }
  });

  it('never repeats a snippet within a hit', async () => {
    const { hits } = await searchDocs('housekeeping', 20);
    for (const hit of hits) expect(new Set(hit.snippets).size, hit.url).toBe(hit.snippets.length);
  });

  it('counts pages, not rows, against the limit', async () => {
    for (const limit of [1, 2, 3, 5, 10]) {
      const { hits } = await searchDocs('the', limit);
      expect(hits.length, `limit ${limit}`).toBe(limit);
    }
  });

  it('defaults to ten pages and never exceeds the ceiling', async () => {
    expect((await searchDocs('the')).hits.length).toBeLessThanOrEqual(DEFAULT_SEARCH_LIMIT);
    expect((await searchDocs('the', 1000)).hits.length).toBeLessThanOrEqual(MAX_SEARCH_LIMIT);
  });

  it('returns no hits for an empty or blank query', async () => {
    expect(await searchDocs('')).toEqual({ hits: [] });
    expect(await searchDocs('   ')).toEqual({ hits: [] });
  });

  it('returns no hits for a query that matches nothing', async () => {
    expect(await searchDocs('zxqvjkwpl')).toEqual({ hits: [] });
  });
});

describe('pathToSlugs', () => {
  it.each([
    ['/x/y', ['x', 'y']],
    ['x/y', ['x', 'y']],
    ['https://docs.marfa.so/x/y', ['x', 'y']],
    ['https://docs.marfa.so/x/y.md?z=1#top', ['x', 'y']],
    ['/x/y.md', ['x', 'y']],
    ['/x/y/', ['x', 'y']],
    ['/docs/x/y', ['docs', 'x', 'y']],
    ['/docs-x/y', ['docs-x', 'y']],
    ['  /x/y  ', ['x', 'y']],
    ['/', []],
    ['', []],
  ])('reads %j as %j', (input, slugs) => {
    expect(pathToSlugs(input)).toEqual(slugs);
  });
});

describe('fetchDocsPage', () => {
  it('returns the Markdown of a page, whichever way the path is written', async () => {
    const page = await fetchDocsPage('/run/housekeeping');
    expect(page).not.toBeNull();
    expect(page).toMatch(/^# Housekeeping \(\/run\/housekeeping\)\n/);
    expect(page).toContain('housekeeping jobs');

    for (const form of ['run/housekeeping', '/run/housekeeping.md', '/run/housekeeping/']) {
      expect(await fetchDocsPage(form), form).toBe(page);
    }
  });

  it('returns null for a page that does not exist', async () => {
    expect(await fetchDocsPage('/definitely/not/a/page')).toBeNull();
  });

  it('serves the Overview and Reference pages at the site root, and nothing at the old paths', async () => {
    const page = await fetchDocsPage('/files');
    expect(page).toMatch(/^# Files \(\/files\)\n/);
    expect(await fetchDocsPage('/overview.md')).toMatch(/^# Overview \(\/overview\)\n/);
    expect(await fetchDocsPage('/cli')).toContain('marfa items list');
    expect(await fetchDocsPage('/typescript-sdk')).toMatch(/^# TypeScript SDK \(\/typescript-sdk\)\n/);
    // A command keeps its output, and code tabs keep their examples under each tab's label.
    const quickstart = await fetchDocsPage('/quickstart');
    expect(quickstart).toContain('marfa items create --type core.note');
    expect(quickstart).toContain('Output:');
    expect(await fetchDocsPage('/build/write-safely')).toContain('**TypeScript**');
    expect(await fetchDocsPage('/cli-reference')).toBeNull();
    expect(await fetchDocsPage('/cli/items')).toBeNull();
    expect(await fetchDocsPage('/typescript-client')).toBeNull();
    expect(await fetchDocsPage('/build/docs-mcp-server')).toBeNull();
    expect(await fetchDocsPage('/get-started/files')).toBeNull();
    expect(await fetchDocsPage('/tools/marfa-command')).toBeNull();
  });

  it('returns every page the topics list, including ones whose names start with docs', async () => {
    const { pages } = listTopics();
    expect(pages.map((p) => p.url)).toContain('/docs-for-agents');
    expect(pages.map((p) => p.url)).toContain('/marfa-mcp-server');
    for (const { url } of pages) {
      expect(await fetchDocsPage(url), url).not.toBeNull();
    }
  });
});

describe('listTopics', () => {
  it('lists every page with its title, url, description and breadcrumbs', () => {
    const { pages } = listTopics();
    expect(pages.length).toBeGreaterThan(0);
    const housekeeping = pages.find((p) => p.url === '/run/housekeeping');
    expect(housekeeping).toEqual({
      title: 'Housekeeping',
      url: '/run/housekeeping',
      description: expect.any(String),
      breadcrumbs: ['run', 'housekeeping'],
    });
  });
});

const SAMPLE = [
  '# Sample (/sample)',
  '',
  'Lead.',
  '',
  '## First [#first]',
  'First body.',
  '```bash',
  '# a comment, not a heading',
  '## nor this',
  '```',
  '### Nested [#nested]',
  'Nested body.',
  '## Second',
  'Second body.',
  '### Nested [#nested-1]',
  'Other nested body.',
  '## Last [#last]',
  'Last body.',
].join('\n');

describe('listHeadings', () => {
  it('lists the headings below the page title, with level, text and id', () => {
    expect(listHeadings(SAMPLE)).toEqual([
      { level: 2, text: 'First', id: 'first' },
      { level: 3, text: 'Nested', id: 'nested' },
      { level: 2, text: 'Second', id: null },
      { level: 3, text: 'Nested', id: 'nested-1' },
      { level: 2, text: 'Last', id: 'last' },
    ]);
  });

  it('ignores lines that look like headings inside a fenced code block', () => {
    expect(listHeadings(SAMPLE).map((h) => h.text)).not.toContain('nor this');
    expect(listHeadings('# T (/t)\n\n~~~\n## no\n~~~\n## yes')).toEqual([{ level: 2, text: 'yes', id: null }]);
  });

  it('returns nothing for a page with no headings', () => {
    expect(listHeadings('# T (/t)\n\nJust text.')).toEqual([]);
  });
});

describe('extractSection', () => {
  it('returns a heading with everything under it, up to the next heading of its level or higher', () => {
    expect(extractSection(SAMPLE, 'First')).toBe(
      [
        '## First [#first]',
        'First body.',
        '```bash',
        '# a comment, not a heading',
        '## nor this',
        '```',
        '### Nested [#nested]',
        'Nested body.',
      ].join('\n'),
    );
  });

  it('stops a nested section at the next heading of any shallower or equal level', () => {
    expect(extractSection(SAMPLE, 'nested')).toBe('### Nested [#nested]\nNested body.');
    expect(extractSection(SAMPLE, 'Last')).toBe('## Last [#last]\nLast body.');
  });

  it('matches by id, which tells repeated headings apart, and takes the first of a repeated text', () => {
    expect(extractSection(SAMPLE, 'nested-1')).toBe('### Nested [#nested-1]\nOther nested body.');
    expect(extractSection(SAMPLE, '#nested-1')).toBe('### Nested [#nested-1]\nOther nested body.');
    expect(extractSection(SAMPLE, 'Nested')).toBe('### Nested [#nested]\nNested body.');
  });

  it('matches ignoring case, surrounding space and leading hashes', () => {
    for (const q of ['SECOND', ' second ', '## Second']) expect(extractSection(SAMPLE, q), q).toBe('## Second\nSecond body.\n### Nested [#nested-1]\nOther nested body.');
  });

  it('returns null for a heading the page does not have, including the page title and fenced lines', () => {
    for (const q of ['Missing', 'Sample', 'nor this', 'a comment, not a heading', '']) {
      expect(extractSection(SAMPLE, q), q).toBeNull();
    }
  });
});

describe('fetchDocsSection', () => {
  it('returns the section of a real page', async () => {
    const result = await fetchDocsSection('/files', 'Who may read a blob');
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.markdown.startsWith('## Who may read a blob')).toBe(true);
    expect(await fetchDocsPage('/files')).toContain(result.markdown);
  });

  it('lists the page headings when the section is unknown', async () => {
    const result = await fetchDocsSection('/files', 'Nope');
    expect(result.status).toBe('section_not_found');
    if (result.status !== 'section_not_found') return;
    expect(result.headings.map((h) => h.text)).toContain('Who may read a blob');
  });

  it('reports a missing page before it looks for a section', async () => {
    expect(await fetchDocsSection('/definitely/not/a/page', 'Anything')).toEqual({ status: 'page_not_found' });
  });
});
