import { describe, expect, it } from 'vitest';
import { growthWarning, grewTooMuch, parseChangedPages } from '../../scripts/page-growth';

describe('grewTooMuch', () => {
  it('warns only when a page grows by more than 30% and by more than 2,000 characters', () => {
    expect(grewTooMuch(5000, 7001)).toBe(true);
    expect(grewTooMuch(5000, 7000)).toBe(false); // exactly 2,000 more
    expect(grewTooMuch(10000, 12500)).toBe(false); // 2,500 more but only 25%
    expect(grewTooMuch(10000, 13001)).toBe(true);
    expect(grewTooMuch(10000, 13000)).toBe(false); // exactly 30%
    expect(grewTooMuch(500, 2501)).toBe(true);
    expect(grewTooMuch(500, 2500)).toBe(false);
  });

  it('never warns about a page that did not grow', () => {
    expect(grewTooMuch(5000, 5000)).toBe(false);
    expect(grewTooMuch(9000, 3000)).toBe(false);
  });
});

describe('growthWarning', () => {
  it('is a workflow annotation on the file, pointing to STYLE.md', () => {
    expect(growthWarning('content/docs/guides/files.mdx', 4000, 6000)).toBe(
      '::warning file=content/docs/guides/files.mdx::This page grew from 4000 to 6000 characters (50 percent longer). ' +
        'Check whether the new text belongs in the API reference or the contract instead, ' +
        'or replaces something already here: STYLE.md, "Keeping pages current".',
    );
  });

  it('escapes the characters a workflow command reserves in the path', () => {
    expect(growthWarning('a,b:c%d.mdx', 1000, 4000)).toMatch(/^::warning file=a%2Cb%3Ac%25d\.mdx::/);
  });
});

describe('parseChangedPages', () => {
  it('keeps modified and renamed pages under content/docs, with the old path of a rename', () => {
    const status = [
      'M\tcontent/docs/a.mdx',
      'A\tcontent/docs/added.mdx',
      'D\tcontent/docs/deleted.mdx',
      'R087\tcontent/docs/old.mdx\tcontent/docs/guides/new.mdx',
      'M\tcontent/docs/meta.json',
      'M\tREADME.md',
      '',
    ].join('\n');
    expect(parseChangedPages(status)).toEqual([
      { path: 'content/docs/a.mdx', basePath: 'content/docs/a.mdx' },
      { path: 'content/docs/guides/new.mdx', basePath: 'content/docs/old.mdx' },
    ]);
  });
});
