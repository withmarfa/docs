import type * as PageTree from 'fumadocs-core/page-tree';
import { regroupApiReference } from '@/lib/api-reference-tree';
import { source } from '@/lib/source';

/**
 * A hierarchical index of the docs (Anthropic claude_code_docs_map.md pattern),
 * read from the page tree so it has the same tabs, groups and order as the
 * sidebar: each tab is an H2, each sidebar group or API tag an H3, and each
 * page a Markdown link. Served at `/docs-map.md` for agents that want one fetch
 * with every page and its address.
 */
export function buildDocsMap(): string {
  const pages = new Map(source.getPages().map((page) => [page.url, page]));
  const lines: string[] = [
    '# Marfa documentation map',
    '',
    'Hierarchical index of every page on docs.marfa.so. Each link resolves to the human-readable HTML page; append `.md` for the markdown twin (e.g. `/items-and-types.md`).',
    '',
  ];

  const text = (name: PageTree.Node['name']) => (typeof name === 'string' ? name : '');

  const pageLine = (node: PageTree.Item) => {
    const page = pages.get(node.url);
    const title = page?.data.title ?? text(node.name);
    const description = page?.data.description;
    return `- [${title}](${node.url})${description ? `: ${description}` : ''}`;
  };

  // Pages under a heading; a nested folder adds its pages to the same list.
  const walk = (nodes: PageTree.Node[], out: string[]) => {
    for (const node of nodes) {
      if (node.type === 'page') out.push(pageLine(node));
      else if (node.type === 'folder') {
        if (node.index) out.push(pageLine(node.index));
        walk(node.children, out);
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
      } else if (node.type === 'folder') {
        flush();
        lines.push(`### ${text(node.name)}`, '');
        walk([node], group);
        flush();
      } else {
        walk([node], group);
      }
    }
    flush();
  }

  return lines.join('\n');
}
