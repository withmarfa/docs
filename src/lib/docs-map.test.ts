import { describe, expect, it } from 'vitest';
import { buildDocsMap, buildLlmsTxt } from '@/lib/docs-map';
import { TOP_BAR_LINKS } from '@/lib/top-bar';
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

  it('lists the six tabs in order, then the top-bar pages, as H2 headings', () => {
    expect(lines.filter((line) => line.startsWith('## '))).toEqual(['## Start', '## Use', '## Run', '## Build', '## Catalog', '## Reference', '## Also in the top bar']);
  });

  it('groups each tab as the sidebar does', () => {
    const start = lines.slice(lines.indexOf('## Start'), lines.indexOf('## Use'));
    expect(start.filter((line) => line.startsWith('### '))).toEqual([]);
    expect(start.some((line) => line.startsWith('- [What Marfa is](/)'))).toBe(true);
    expect(start.some((line) => line.startsWith('- [Connect your agent](/connect-your-agent)'))).toBe(true);

    const use = lines.slice(lines.indexOf('## Use'), lines.indexOf('## Run'));
    expect(use.filter((line) => line.startsWith('### '))).toEqual(['### Day to day', '### A synced folder', '### Connectors', '### Access', '### When you need more']);
    expect(use.some((line) => line.startsWith('- [Work from an agent](/use/from-an-agent)'))).toBe(true);
    expect(use.some((line) => line.startsWith('- [Sync a folder](/use/sync-a-folder)'))).toBe(true);

    const run = lines.slice(lines.indexOf('## Run'), lines.indexOf('## Build'));
    expect(run.filter((line) => line.startsWith('### '))).toEqual(['### Set up', '### Keys and apps', '### Look after it']);
    expect(run.some((line) => line.startsWith('- [Troubleshooting](/run/troubleshooting)'))).toBe(true);

    const build = lines.slice(lines.indexOf('## Build'), lines.indexOf('## Catalog'));
    expect(build.filter((line) => line.startsWith('### '))).toEqual(['### Concepts', '### Tutorials', '### Build apps and agents', '### Build on a working copy', '### Build connectors']);
    expect(build.some((line) => line.startsWith("- [Marfa's architecture](/build/architecture)"))).toBe(true);

    // The Types and Connectors pages are folders, so their pages nest under them.
    const catalog = lines.slice(lines.indexOf('## Catalog'), lines.indexOf('## Reference'));
    const reference = lines.slice(lines.indexOf('## Reference'), lines.indexOf('## Also in the top bar'));
    expect(catalog.filter((line) => /^(- |  - |    - )/.test(line)).map((line) => line.replace(/\]\(.*$/, ']').replace(/^( *- )\[/, '$1'))).toEqual([
      '- Items]',
      '- Types]',
      '  - Core types',
      ...['Bookmark', 'Collection', 'Conversation', 'Entity', 'Event', 'File', 'Highlight', 'Media', 'Message', 'Note', 'Table', 'Task'].map((title) => `    - ${title}]`),
      '  - System types',
      ...['Connection', 'Folder', 'View'].map((title) => `    - ${title}]`),
      '  - Type rules]',
      '  - Display hints]',
      '  - Field kinds]',
      '- Edge types]',
      ...['about', 'attached-to', 'comments-on', 'derived-from', 'excerpt-of', 'in-collection', 'in-folder', 'in-thread', 'parent-of', 'references', 'supersedes'].map((title) => `  - ${title}]`),
      '- Events]',
      '- Permissions]',
      '- Connectors]',
      // File-name order, as the sidebar lists them: `readwise-reader` sorts before `readwise`.
      ...['GitHub', 'Google Calendar', 'Readwise Reader', 'Readwise', 'RSS', 'Todoist'].map((title) => `  - ${title}]`),
    ]);
    expect(catalog.some((line) => line.startsWith('  - [GitHub](/catalog/connectors/github)'))).toBe(true);
    expect(catalog.some((line) => line.startsWith('    - [Media](/catalog/media)'))).toBe(true);
    expect(catalog.some((line) => line.startsWith('- [Types](/catalog/types)'))).toBe(true);

    const groups = reference.filter((line) => line.startsWith('### '));
    expect(groups[0]).toBe('### HTTP API');
    expect(groups.slice(-3)).toEqual(['### SDKs', '### CLI and MCP', '### Resources']);
    expect(reference.some((line) => line.startsWith('- [TypeScript SDK](/typescript-sdk)'))).toBe(true);
    expect(reference.some((line) => line.startsWith('- [Marfa MCP server](/marfa-mcp-server)'))).toBe(true);
    expect(reference.some((line) => line.startsWith('- [Docs MCP server](/docs-mcp-server)'))).toBe(true);
    expect(reference.some((line) => line.startsWith('- [The contract](https://github.com/'))).toBe(true);
  });

  it('lists the pages the top bar links to last, and in no tab', () => {
    const topBar = lines.slice(lines.indexOf('## Also in the top bar'));
    expect(topBar.filter((line) => line.startsWith('- ')).map((line) => line.replace(/\].*$/, ']'))).toEqual(['- [Glossary]', '- [Changelog]', '- [Get help]']);
    expect(lines.slice(0, lines.indexOf('## Also in the top bar')).filter((line) => /\]\(\/(glossary|changelog|get-help)\)/.test(line))).toEqual([]);
  });

  it('has a page for every top-bar link, and the page tree holds none of them', () => {
    const inTree = new Set<string>();
    const walk = (nodes: { type: string; url?: string; index?: { url: string }; children?: unknown[] }[]) => {
      for (const node of nodes) {
        if (node.url) inTree.add(node.url);
        if (node.index) inTree.add(node.index.url);
        if (node.children) walk(node.children as typeof nodes);
      }
    };
    walk(source.getPageTree().children as Parameters<typeof walk>[0]);
    for (const { href } of TOP_BAR_LINKS) {
      expect(source.getPage(href.split('/').filter(Boolean)), href).toBeDefined();
      expect(inTree.has(href), href).toBe(false);
    }
  });

  it('lists the CLI as one page, with nothing nested under it', () => {
    const cli = lines.findIndex((line) => line.startsWith('- [CLI](/cli)'));
    expect(cli).toBeGreaterThan(-1);
    expect(lines[cli + 1]).not.toMatch(/^ {2}- /);
    expect(map).not.toContain('](/cli/');
  });

  it('names no page under a path prefix the site does not use', () => {
    expect(map).not.toMatch(/\]\(\/(get-started|tools)[/)]/);
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
    expect(text).toContain('- [What Marfa is](https://docs.marfa.so/index.md)');
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
    const intro = text.slice(0, text.indexOf('## Start'));
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
    expect(full).toContain(await getLLMText(source.getPage([])!));
    expect(full).toContain('# Errors (/api-reference/errors)');
    expect(full).not.toContain('# Create an item (/api-reference/items/createItem)');
  });

  it('holds the pages in sidebar order', async () => {
    const full = await getLlmsFullText();
    const at = (url: string) => full.indexOf(`(${url})\n`);
    const urls = ['/', '/quickstart', '/connect-your-agent', '/use/from-an-agent', '/run/install', '/build/architecture', '/build/access', '/catalog/items'];
    for (const url of urls) expect(at(url), url).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < urls.length; i += 1) expect(at(urls[i - 1]), urls[i]).toBeLessThan(at(urls[i]));
  });
});
