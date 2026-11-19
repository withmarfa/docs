import { loader } from 'fumadocs-core/source';
import type * as PageTree from 'fumadocs-core/page-tree';
import { describe, expect, it } from 'vitest';
import { sidebarLabelPlugin } from './sidebar-label';

// A fixture source: one page with a label, one without, and a folder that
// opens on a labelled page.
const fixture = loader({
  source: {
    files: [
      { type: 'page', path: 'long.mdx', data: { title: 'A page with a long and tiring title', description: 'D', sidebar_label: 'Short title' } },
      { type: 'page', path: 'plain.mdx', data: { title: 'A page with no label', description: 'D' } },
      { type: 'page', path: 'folder/index.mdx', data: { title: 'A folder that opens on a long page', description: 'D', sidebar_label: 'Folder' } },
      { type: 'page', path: 'folder/child.mdx', data: { title: 'Child', description: 'D' } },
    ],
  },
  baseUrl: '/',
  plugins: [sidebarLabelPlugin()],
});

function names(nodes: PageTree.Node[]): string[] {
  return nodes.flatMap((node) => [String(node.name), ...(node.type === 'folder' ? names(node.children) : [])]);
}

describe('sidebar_label', () => {
  it('names the sidebar item with the label and leaves an unlabelled page on its title', () => {
    const tree = names(fixture.getPageTree().children);
    expect(tree).toContain('Short title');
    expect(tree).toContain('A page with no label');
    expect(tree).not.toContain('A page with a long and tiring title');
  });

  it('names a folder that opens on a labelled page with the label', () => {
    const folder = fixture.getPageTree().children.find((node) => node.type === 'folder');
    expect(folder?.name).toBe('Folder');
  });

  it('keeps the full title on the page, which the heading, search, llms.txt and metadata read', () => {
    expect(fixture.getPage(['long'])?.data.title).toBe('A page with a long and tiring title');
    expect(fixture.getPage(['folder'])?.data.title).toBe('A folder that opens on a long page');
  });
});
