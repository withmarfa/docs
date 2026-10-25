import { describe, expect, it } from 'vitest';
import { buildDocsMap, buildLlmsTxt } from '@/lib/docs-map';
import { getLLMText, getLlmsFullText, inLlmsFull, source } from '@/lib/source';
import spec from '../../openapi.json';

// The operationIds listed under a group's heading, in the order the index gives them.
function operationsUnder(text: string, heading: string): string[] {
  const lines = text.split('\n');
  const start = lines.indexOf(`### ${heading}`, lines.indexOf('## Reference'));
  const end = lines.findIndex((line, index) => index > start && line.startsWith('#'));
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .flatMap((line) => /\]\((?:https:\/\/docs\.marfa\.so)?\/api-reference\/[^/]+\/([^/)]+)\)/.exec(line)?.[1] ?? []);
}

const orders = (spec.tags as { name: string; 'x-operation-order'?: string[] }[]).map(
  (tag) => [tag.name, tag['x-operation-order'] ?? []] as const,
);

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

    // The Catalog has no group headings: the Types page is a folder, so its pages nest under it.
    const catalog = lines.slice(lines.indexOf('## Catalog'), lines.indexOf('## Reference'));
    expect(catalog.filter((line) => line.startsWith('### '))).toEqual([]);
    expect(catalog.filter((line) => /^(- |  - |    - )/.test(line)).map((line) => line.replace(/\]\(.*$/, ']').replace(/^( *- )\[/, '$1'))).toEqual([
      '- Catalog]',
      '- Items]',
      '- Types]',
      '  - Core types',
      ...['Bookmark', 'Entity', 'Event', 'File', 'Highlight', 'Media', 'Message', 'Note', 'Task'].map((title) => `    - ${title}]`),
      '  - System types',
      ...['Connection', 'Folder', 'View'].map((title) => `    - ${title}]`),
      '  - Type rules]',
      '  - Field kinds]',
      '- Edges]',
      '- Events]',
      '- Permissions]',
    ]);
    expect(catalog.some((line) => line.startsWith('    - [Media](/catalog/media)'))).toBe(true);
    expect(catalog.some((line) => line.startsWith('- [Types](/catalog/types)'))).toBe(true);
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

  it("lists each group's operations in the order its tag gives", () => {
    for (const [name, order] of orders) expect(operationsUnder(map, name), name).toEqual(order);
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

  it("lists each group's operations in the order its tag gives", () => {
    for (const [name, order] of orders) expect(operationsUnder(text, name), name).toEqual(order);
  });

  it('says what llms-full.txt holds and where the operations and the changelog are', () => {
    const intro = text.slice(0, text.indexOf('## Overview'));
    expect(intro).toContain('`https://docs.marfa.so/llms-full.txt` holds the written pages');
    expect(intro).toContain('leaves out the API operations and the changelog');
    expect(intro).toContain('`openapi.json`');
    expect(intro).toContain('`https://docs.marfa.so/changelog.md`');
    expect(intro).toContain('`https://docs.marfa.so/mcp`');
    expect(intro).toContain('`Accept: text/markdown`');
  });

  it('links the addresses its introduction names only where they exist', () => {
    expect(source.getPage(['changelog'])).toBeDefined();
    expect(text).toContain('(https://docs.marfa.so/changelog.md)');
  });
});

describe('getLlmsFullText', () => {
  it('holds each written page and leaves out the operations and the changelog', async () => {
    const full = await getLlmsFullText();
    const pages = source.getPages();

    const left = pages.filter((page) => !inLlmsFull(page));
    expect(left.some((page) => page.url === '/changelog')).toBe(true);
    expect(left.filter((page) => page.type === 'openapi').length).toBeGreaterThan(100);
    expect(left.every((page) => page.type === 'openapi' || page.url === '/changelog')).toBe(true);

    for (const page of pages) {
      const heading = `# ${page.data.title} (${page.url})\n`;
      expect(full.includes(heading), page.url).toBe(inLlmsFull(page));
    }
    expect(full).toContain(await getLLMText(source.getPage(['overview'])!));
    expect(full).toContain('# Errors (/api-reference/errors)');
    expect(full).not.toContain('# Create an item (/api-reference/items/createItem)');
  });
});
