import type * as PageTree from 'fumadocs-core/page-tree';
import { isTagFolder, regroupApiReference } from '@/lib/api-reference-tree';
import { source } from '@/lib/source';

/**
 * A hierarchical index of the docs (Anthropic claude_code_docs_map.md pattern),
 * read from the page tree so it has the same tabs, groups and order as the
 * sidebar: each tab is an H2, each sidebar group or API tag an H3, and each
 * page a Markdown link. Served at `/docs-map.md` for agents that want one fetch
 * with every page and its address.
 */
export function buildDocsMap(): string {
  return buildIndex(
    [
      '# Marfa documentation map',
      '',
      'Hierarchical index of every page on docs.marfa.so. Each link resolves to the human-readable HTML page; append `.md` for the markdown twin (e.g. `/items-and-types.md`).',
      '',
    ],
    (url) => url,
  );
}

const SITE = 'https://docs.marfa.so';

/**
 * `/llms.txt` in the llmstxt.org shape: the project's name, a one-line summary,
 * how to read the docs, then every page by tab and sidebar group. A written
 * page links to its Markdown copy. An API operation links to its HTML page,
 * because its Markdown copy holds only its title and description.
 */
export function buildLlmsTxt(): string {
  return buildIndex(
    [
      '# Marfa',
      '',
      "> Marfa is a server you run yourself that holds one person's data in one place, in types every app understands, so the apps, scripts and AI agents they allow can read and write it through one HTTP API.",
      '',
      `These docs cover what Marfa is, running an instance, building apps, connectors and agents on it, and the API. Every page below links to its Markdown copy, and the same address without \`.md\` is the HTML. API operations link to their HTML page, which holds the full request and response. \`${SITE}/docs-map.md\` is this index with HTML links, \`${SITE}/llms-full.txt\` holds every page in one file, and the docs MCP server at \`${SITE}/mcp\` searches them.`,
      '',
    ],
    (url, page) => {
      if (!url.startsWith('/')) return url;
      return page && 'getText' in page.data ? `${SITE}${url}.md` : `${SITE}${url}`;
    },
  );
}

type Page = ReturnType<typeof source.getPages>[number];

function buildIndex(header: string[], link: (url: string, page: Page | undefined) => string): string {
  const pages = new Map(source.getPages().map((page) => [page.url, page]));
  const lines: string[] = [...header];

  const text = (name: PageTree.Node['name']) => (typeof name === 'string' ? name : '');

  const pageLine = (node: PageTree.Item) => {
    const page = pages.get(node.url);
    const title = page?.data.title ?? text(node.name);
    const description = page?.data.description;
    return `- [${title}](${link(node.url, page)})${description ? `: ${description}` : ''}`;
  };

  // Pages under a heading. A folder with a landing page is that page with the
  // folder's pages nested under it, and a folder without one is a label with its
  // pages nested under it.
  const walk = (nodes: PageTree.Node[], out: string[], indent = '') => {
    for (const node of nodes) {
      if (node.type === 'page') out.push(indent + pageLine(node));
      else if (node.type === 'folder') {
        if (node.index) {
          out.push(indent + pageLine(node.index));
          walk(node.children, out, `${indent}  `);
        } else {
          out.push(`${indent}- ${text(node.name)}`);
          walk(node.children, out, `${indent}  `);
        }
      }
    }
  };

  for (const tab of regroupApiReference(source.getPageTree()).children) {
    if (tab.type !== 'folder') continue;
    lines.push(`## ${text(tab.name)}`, '');

    let group: string[] = [];
    const flush = () => {
      if (group.length > 0) lines.push(...group, '');
      group = [];
    };
    if (tab.index) group.push(pageLine(tab.index));
    for (const node of tab.children) {
      if (node.type === 'separator') {
        flush();
        if (node.name) lines.push(`### ${text(node.name)}`, '');
      } else if (isTagFolder(node)) {
        flush();
        lines.push(`### ${text(node.name)}`, '');
        walk(node.children, group);
        flush();
      } else {
        walk([node], group);
      }
    }
    flush();
  }

  return lines.join('\n');
}
