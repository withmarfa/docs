import { describe, expect, it } from 'vitest';
import { canonicalUrl, withoutTrailingSlash } from './canonical';
import { headTitle, pageHead } from './page-head';
import { source } from './source';

describe('pageHead', () => {
  it('gives the title, description, canonical address and Markdown copy', () => {
    const head = pageHead({ title: 'Overview', description: 'Start here.', url: '/quickstart', markdownUrl: '/quickstart.md' });
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://docs.marfa.so/quickstart' },
      { rel: 'alternate', type: 'text/markdown', href: '/quickstart.md' },
    ]);
    expect(head.meta).toEqual([
      { title: 'Overview | Marfa Docs' },
      { name: 'description', content: 'Start here.' },
      { property: 'og:description', content: 'Start here.' },
      { property: 'og:title', content: 'Overview' },
      { property: 'og:url', content: 'https://docs.marfa.so/quickstart' },
    ]);
  });

  it('drops backticks from the description and leaves out an empty one', () => {
    const withCode = pageHead({ title: 'T', description: 'Use `x`.', url: '/t', markdownUrl: '/t.md' });
    expect(withCode.meta[1]).toEqual({ name: 'description', content: 'Use x.' });
    expect(withCode.meta[2]).toEqual({ property: 'og:description', content: 'Use x.' });
    const empty = pageHead({ title: 'T', description: '', url: '/t', markdownUrl: '/t.md' }).meta;
    expect(empty.map((tag) => ('name' in tag ? tag.name : 'property' in tag ? tag.property : 'title'))).toEqual([
      'title',
      'og:title',
      'og:url',
    ]);
  });

  it('adds nothing for a page that does not exist', () => {
    expect(pageHead(undefined)).toEqual({ meta: [], links: [] });
  });
});

describe('headTitle', () => {
  it('names a page by its headTitle, with the site name after it unless it leads', () => {
    expect(headTitle({ title: 'Overview', headTitle: 'Run overview' })).toEqual({
      title: 'Run overview | Marfa Docs',
      ogTitle: 'Run overview',
    });
    expect(headTitle({ title: 'Overview', headTitle: 'Marfa Docs: a shared data layer' })).toEqual({
      title: 'Marfa Docs: a shared data layer',
      ogTitle: 'Marfa Docs: a shared data layer',
    });
    const head = pageHead({ title: 'Overview', headTitle: 'Run overview', description: '', url: '/run', markdownUrl: '/run.md' });
    expect(head.meta).toContainEqual({ property: 'og:title', content: 'Run overview' });
  });

  it('gives no two pages the same title', () => {
    const seen = new Map<string, string>();
    const repeats: string[] = [];
    for (const page of source.getPages()) {
      const { title } = headTitle({
        title: page.data.title ?? '',
        headTitle: 'headTitle' in page.data ? page.data.headTitle : undefined,
      });
      const other = seen.get(title);
      if (other) repeats.push(`"${title}": ${other} and ${page.url}`);
      else seen.set(title, page.url);
    }
    expect(repeats).toEqual([]);
  });
});

describe('canonicalUrl', () => {
  it.each([
    ['/', 'https://docs.marfa.so/'],
    ['', 'https://docs.marfa.so/'],
    ['/run/deploy', 'https://docs.marfa.so/run/deploy'],
    ['/run/deploy/', 'https://docs.marfa.so/run/deploy'],
    ['/run/deploy//', 'https://docs.marfa.so/run/deploy'],
  ])('gives %s as %s', (path, url) => {
    expect(canonicalUrl(path)).toBe(url);
  });

  it('keeps the root as a single slash', () => {
    expect(withoutTrailingSlash('/')).toBe('/');
    expect(withoutTrailingSlash('///')).toBe('/');
  });
});
