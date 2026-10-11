import { describe, expect, it } from 'vitest';
import { buildDocsMap } from '@/lib/docs-map';

describe('buildDocsMap', () => {
  const map = buildDocsMap();
  const lines = map.split('\n');

  it('lists the three tabs in order, as H2 headings', () => {
    expect(lines.filter((line) => line.startsWith('## '))).toEqual([
      '## Overview',
      '## Guides',
      '## API reference',
    ]);
  });

  it('groups the Overview as the sidebar does, with pages at the site root', () => {
    const overview = lines.slice(lines.indexOf('## Overview'), lines.indexOf('## Guides'));
    expect(overview.filter((line) => line.startsWith('### '))).toEqual([
      '### Get started',
      '### Concepts',
      '### SDKs and CLI',
      '### Resources',
    ]);
    expect(overview.some((line) => line.startsWith('- [Overview](/overview)'))).toBe(true);
    expect(overview.some((line) => line.startsWith('- [CLI reference](/cli-reference)'))).toBe(true);
    expect(overview.some((line) => line.startsWith('- [The contract](https://github.com/'))).toBe(true);
  });

  it('names no page under the old tabs', () => {
    expect(map).not.toMatch(/\]\(\/(get-started|tools)[/)]/);
    expect(map).not.toContain('## Tools');
  });

  it('lists every API reference operation under its tag', () => {
    const api = lines.slice(lines.indexOf('## API reference'));
    expect(api.some((line) => line.startsWith('### Items'))).toBe(true);
    expect(api.some((line) => line.startsWith('- [Create an item](/api-reference/items/createItem)'))).toBe(true);
  });
});
