import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  MAX_SNIPPETS_PER_PAGE,
  fetchDocsPage,
  listTopics,
  pathToSlugs,
  searchDocs,
} from './docs-tools';

describe('searchDocs', () => {
  it('finds a page and groups its fragments into one hit', async () => {
    const { hits } = await searchDocs('housekeeping');
    expect(hits.length).toBeGreaterThan(0);

    const urls = hits.map((h) => h.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain('/guides/housekeeping');
    for (const hit of hits) {
      expect(hit.title).not.toBe('');
      expect(hit.snippets.length).toBeLessThanOrEqual(MAX_SNIPPETS_PER_PAGE);
    }
  });

  it('keeps at most the requested number of hits', async () => {
    const { hits } = await searchDocs('the', 2);
    expect(hits.length).toBeLessThanOrEqual(2);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('defaults to ten hits and never exceeds the ceiling', async () => {
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
    ['/docs/x/y', ['x', 'y']],
    ['  /x/y  ', ['x', 'y']],
    ['/', []],
    ['', []],
  ])('reads %j as %j', (input, slugs) => {
    expect(pathToSlugs(input)).toEqual(slugs);
  });
});

describe('fetchDocsPage', () => {
  it('returns the Markdown of a page, whichever way the path is written', async () => {
    const page = await fetchDocsPage('/guides/housekeeping');
    expect(page).not.toBeNull();
    expect(page).toMatch(/^# Housekeeping \(\/guides\/housekeeping\)\n/);
    expect(page).toContain('housekeeping jobs');

    for (const form of ['guides/housekeeping', '/guides/housekeeping.md', '/guides/housekeeping/', '/docs/guides/housekeeping']) {
      expect(await fetchDocsPage(form), form).toBe(page);
    }
  });

  it('returns null for a page that does not exist', async () => {
    expect(await fetchDocsPage('/definitely/not/a/page')).toBeNull();
  });
});

describe('listTopics', () => {
  it('lists every page with its title, url, description and breadcrumbs', () => {
    const { pages } = listTopics();
    expect(pages.length).toBeGreaterThan(0);
    const housekeeping = pages.find((p) => p.url === '/guides/housekeeping');
    expect(housekeeping).toEqual({
      title: 'Housekeeping',
      url: '/guides/housekeeping',
      description: expect.any(String),
      breadcrumbs: ['guides', 'housekeeping'],
    });
  });
});
