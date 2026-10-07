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
  it('folds a page and its matching fragments into one hit', async () => {
    const { hits } = await searchDocs('housekeeping');
    expect(hits.length).toBeGreaterThan(0);

    const urls = hits.map((h) => h.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.filter((u) => u === '/guides/housekeeping')).toHaveLength(1);
    for (const hit of hits) {
      expect(hit.url).not.toContain('#');
      expect(hit.snippets.length).toBeLessThanOrEqual(MAX_SNIPPETS_PER_PAGE);
    }

    const page = hits.find((h) => h.url === '/guides/housekeeping')!;
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

  it('counts pages, not rows, against the limit', async () => {
    for (const limit of [1, 2, 10]) {
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
