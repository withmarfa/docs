import { describe, expect, it } from 'vitest';
import { pageHead } from './page-head';

describe('pageHead', () => {
  it('points to the Markdown copy of the page', () => {
    const head = pageHead({ title: 'Overview', description: 'Start here.', markdownUrl: '/overview.md' });
    expect(head.links).toEqual([{ rel: 'alternate', type: 'text/markdown', href: '/overview.md' }]);
    expect(head.meta).toEqual([
      { title: 'Overview | Marfa Docs' },
      { name: 'description', content: 'Start here.' },
    ]);
  });

  it('drops backticks from the description and leaves out an empty one', () => {
    const withCode = pageHead({ title: 'T', description: 'Use `x`.', markdownUrl: '/t.md' });
    expect(withCode.meta[1]).toEqual({ name: 'description', content: 'Use x.' });
    expect(pageHead({ title: 'T', description: '', markdownUrl: '/t.md' }).meta).toHaveLength(1);
  });

  it('adds nothing for a page that does not exist', () => {
    expect(pageHead(undefined)).toEqual({ meta: [], links: [] });
  });
});
