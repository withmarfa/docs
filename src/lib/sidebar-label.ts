import type { LoaderPlugin } from 'fumadocs-core/source';

/**
 * A page's optional `sidebar_label` front-matter field: a shorter name for the
 * sidebar. It replaces the name of the page's node in the page tree, which the
 * sidebar and the breadcrumb read, and nothing else, so the page heading, the
 * previous and next cards (`fullTitles`), the search index, `llms.txt`, the
 * Markdown copy and the metadata keep the full title. A folder that opens on a
 * page takes the page's label, unless its `meta.json` sets a title.
 */
export const sidebarLabelPlugin = (): LoaderPlugin => ({
  name: 'marfa:sidebar-label',
  transformPageTree: {
    file(node, filePath) {
      if (!filePath) return node;
      const file = this.storage.read(filePath);
      if (file?.format !== 'page') return node;
      const label = (file.data as { sidebar_label?: unknown }).sidebar_label;
      if (typeof label === 'string' && label !== '') node.name = label;
      return node;
    },
  },
});

type TitledPage = { url: string; data: { title?: string; sidebar_label?: unknown } };

/**
 * The full title of each page that has a `sidebar_label`, by address. The
 * previous and next cards read the page tree, whose names are the labels, so
 * the route sends this beside the tree and the cards swap the title back in.
 */
export function fullTitles(pages: TitledPage[]): Record<string, string> {
  const titles: Record<string, string> = {};
  for (const page of pages) {
    const { title, sidebar_label: label } = page.data;
    if (typeof label === 'string' && label !== '' && typeof title === 'string') titles[page.url] = title;
  }
  return titles;
}
