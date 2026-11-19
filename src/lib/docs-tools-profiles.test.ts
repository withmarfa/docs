import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('@/lib/source');
  vi.doUnmock('fumadocs-core/search/server');
  vi.resetModules();
});

describe('the page profiles that search ranks by', () => {
  it('are built again after a failed build, not kept as a rejection', async () => {
    let calls = 0;
    const page = {
      url: '/a',
      path: 'run/a.mdx',
      data: {
        title: 'A page',
        getText: () => '',
        structuredData: async () => {
          calls += 1;
          if (calls === 1) throw new Error('not ready');
          return { headings: [{ id: 'h', content: 'A heading' }], contents: [] };
        },
      },
    };
    vi.resetModules();
    vi.doMock('@/lib/source', () => ({
      source: { getPages: () => [page], getPage: () => page },
      getLLMText: async () => '',
    }));
    vi.doMock('fumadocs-core/search/server', () => ({
      // The index reports each page's score through the plugin `docs-tools` passes it, as Orama does after a search.
      createFromSource: (_loader: unknown, options: { plugins: { afterSearch: (...args: unknown[]) => void }[] }) => ({
        search: async (query: string) => {
          options.plugins[0].afterSearch(null, { term: query }, undefined, { hits: [{ score: 1, document: { page_id: '/a' } }] });
          return [{ url: '/a', type: 'page', content: 'A page', breadcrumbs: [] }];
        },
      }),
    }));
    const { searchDocs } = await import('./docs-tools');
    await expect(searchDocs('page')).rejects.toThrow('not ready');
    const { hits } = await searchDocs('page');
    expect(hits.map((h) => h.url)).toEqual(['/a']);
    expect(calls).toBe(2);
  });
});
