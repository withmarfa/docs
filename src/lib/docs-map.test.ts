import { describe, expect, it } from 'vitest';
import { buildDocsMap, buildLlmsTxt } from '@/lib/docs-map';

describe('buildDocsMap', () => {
  const map = buildDocsMap();
  const lines = map.split('\n');

  it('lists the four tabs in order, as H2 headings', () => {
    expect(lines.filter((line) => line.startsWith('## '))).toEqual(['## Overview', '## Guides', '## Catalog', '## Reference']);
  });

  it('groups each tab as the sidebar does', () => {
    const overview = lines.slice(lines.indexOf('## Overview'), lines.indexOf('## Guides'));
    expect(overview.filter((line) => line.startsWith('### '))).toEqual(['### Get started', '### Concepts', '### AI tools']);
    expect(overview.some((line) => line.startsWith('- [Docs MCP server](/docs-mcp-server)'))).toBe(true);
    expect(overview.some((line) => line.startsWith('- [Overview](/overview)'))).toBe(true);
    expect(overview.some((line) => line.startsWith('- [Glossary](/glossary)'))).toBe(true);

    const guides = lines.slice(lines.indexOf('## Guides'), lines.indexOf('## Catalog'));
    expect(guides).toContain('### Build apps and agents');
    expect(guides).not.toContain('### AI agents');
    expect(guides.some((line) => line.startsWith('- [Use Marfa with AI agents](/guides/ai-agents)'))).toBe(true);
    expect(guides.some((line) => line.startsWith('- [Troubleshooting](/guides/troubleshooting)'))).toBe(true);

    const catalog = lines.slice(lines.indexOf('## Catalog'), lines.indexOf('## Reference'));
    expect(catalog.filter((line) => line.startsWith('### '))).toEqual(['### Types']);
    const ungrouped = catalog.slice(0, catalog.indexOf('### Types'));
    expect(ungrouped.filter((line) => line.startsWith('- ')).map((line) => line.replace(/\]\(.*$/, '').replace(/^- \[/, ''))).toEqual([
      'Catalog',
      'Items',
      'Edges',
      'Events',
      'Permissions',
    ]);
    // The two families are folders in the sidebar, so each is a label with its pages nested under it, in the sidebar's order.
    const types = catalog.slice(catalog.indexOf('### Types'));
    expect(types.filter((line) => /^(- |  - )/.test(line)).map((line) => line.replace(/\]\(.*$/, ']').replace(/^( *- )\[/, '$1'))).toEqual([
      '- Core types',
      ...['Bookmark', 'Entity', 'Event', 'File', 'Highlight', 'Media', 'Message', 'Note', 'Task'].map((title) => `  - ${title}]`),
      '- System types',
      ...['Connection', 'Folder'].map((title) => `  - ${title}]`),
      '- Type rules]',
      '- Field kinds]',
    ]);
    expect(catalog.some((line) => line.startsWith('  - [Media](/catalog/media)'))).toBe(true);
    expect(catalog.some((line) => line.startsWith('- [Catalog](/catalog)'))).toBe(true);

    const reference = lines.slice(lines.indexOf('## Reference'));
    const groups = reference.filter((line) => line.startsWith('### '));
    expect(groups.slice(0, 2)).toEqual(['### SDKs and CLI', '### HTTP API']);
    expect(groups.at(-1)).toBe('### Resources');
    expect(reference.some((line) => line.startsWith('- [TypeScript SDK](/typescript-sdk)'))).toBe(true);
    expect(reference.some((line) => line.startsWith('- [The contract](https://github.com/'))).toBe(true);
  });

  it('lists the CLI as one page, with nothing nested under it', () => {
    const cli = lines.findIndex((line) => line.startsWith('- [CLI](/cli)'));
    expect(cli).toBeGreaterThan(-1);
    expect(lines[cli + 1]).not.toMatch(/^ {2}- /);
    expect(map).not.toContain('](/cli/');
  });

  it('names no page under a path prefix the site does not use', () => {
    expect(map).not.toMatch(/\]\(\/(get-started|tools|reference)[/)]/);
  });

  it('lists every API reference operation under its tag', () => {
    const api = lines.slice(lines.indexOf('## Reference'));
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
    expect(text).toContain('(https://docs.marfa.so/cli.md)');
    expect(text).not.toMatch(/\]\(\/[a-z]/);
  });

  it('links an API operation to its HTML page, which holds the request and answers', () => {
    expect(text).toContain('(https://docs.marfa.so/api-reference/items/createItem)');
    expect(text).not.toContain('createItem.md');
  });
});
