import { describe, expect, it } from 'vitest';
import { buildDocsMap, buildLlmsTxt } from '@/lib/docs-map';

describe('buildDocsMap', () => {
  const map = buildDocsMap();
  const lines = map.split('\n');

  it('lists the four tabs in order, as H2 headings', () => {
    expect(lines.filter((line) => line.startsWith('## '))).toEqual([
      '## Overview',
      '## Tools',
      '## Guides',
      '## API reference',
    ]);
  });

  it('groups the Overview and Tools as the sidebar does, with pages at the site root', () => {
    const overview = lines.slice(lines.indexOf('## Overview'), lines.indexOf('## Tools'));
    expect(overview.filter((line) => line.startsWith('### '))).toEqual(['### Get started', '### Concepts']);
    expect(overview.some((line) => line.startsWith('- [Overview](/overview)'))).toBe(true);

    const tools = lines.slice(lines.indexOf('## Tools'), lines.indexOf('## Guides'));
    expect(tools.filter((line) => line.startsWith('### '))).toEqual([
      '### SDKs and CLI',
      '### AI agents',
      '### Resources',
    ]);
    expect(tools.some((line) => line.startsWith('- [CLI](/cli)'))).toBe(true);
    expect(tools.some((line) => line.startsWith('- [Docs MCP server](/docs-mcp-server)'))).toBe(true);
    expect(tools.some((line) => line.startsWith('- [The contract](https://github.com/'))).toBe(true);
  });

  it('nests the CLI command pages under the CLI page', () => {
    const cli = lines.findIndex((line) => line.startsWith('- [CLI](/cli)'));
    expect(lines[cli + 1]).toMatch(/^ {2}- \[.+\]\(\/cli\/[a-z-]+\)/);
  });

  it('names no page under a path prefix the site does not use', () => {
    expect(map).not.toMatch(/\]\(\/(get-started|tools)[/)]/);
  });

  it('lists every API reference operation under its tag', () => {
    const api = lines.slice(lines.indexOf('## API reference'));
    expect(api.some((line) => line.startsWith('### Items'))).toBe(true);
    expect(api.some((line) => line.startsWith('- [Create an item](/api-reference/items/createItem)'))).toBe(true);
  });
});

describe('buildLlmsTxt', () => {
  const text = buildLlmsTxt();

  it('opens with the project name and a summary, as llmstxt.org asks', () => {
    const [title, blank, summary] = text.split('\n');
    expect(title).toBe('# Marfa');
    expect(blank).toBe('');
    expect(summary.startsWith('> Marfa is ')).toBe(true);
  });

  it('links each written page to its Markdown copy at a full address', () => {
    expect(text).toContain('- [Overview](https://docs.marfa.so/overview.md)');
    expect(text).toContain('(https://docs.marfa.so/cli/items.md)');
    expect(text).not.toMatch(/\]\(\/[a-z]/);
  });

  it('links an API operation to its HTML page, which holds the request and answers', () => {
    expect(text).toContain('(https://docs.marfa.so/api-reference/items/createItem)');
    expect(text).not.toContain('createItem.md');
  });
});
