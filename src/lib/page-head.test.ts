import { describe, expect, it } from 'vitest';
import { canonicalUrl, withoutTrailingSlash } from './canonical';
import { pageHead } from './page-head';

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
