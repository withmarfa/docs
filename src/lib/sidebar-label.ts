import type { LoaderPlugin } from 'fumadocs-core/source';

/**
 * A page's optional `sidebar_label` front-matter field: a shorter name for the
 * sidebar. It replaces the name of the page's node in the page tree and
 * nothing else, so the page heading, the search index, `llms.txt`, the Markdown
 * copy and the metadata keep the full title. A folder that opens on a page
 * takes the page's label, unless its `meta.json` sets a title.
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
