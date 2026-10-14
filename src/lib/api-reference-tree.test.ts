import type * as PageTree from 'fumadocs-core/page-tree';
import { describe, expect, it } from 'vitest';
import { regroupApiReference } from './api-reference-tree';

const page = (url: string): PageTree.Item => ({ type: 'page', name: url, url });
const folder = (name: string, children: PageTree.Node[]): PageTree.Folder => ({ type: 'folder', name, children });

describe('regroupApiReference', () => {
  const tree: PageTree.Root = {
    name: 'docs',
    children: [
      folder('Reference', [
        page('/typescript-sdk'),
        folder('Examples', [page('/examples/b'), page('/examples/a')]),
        folder('Bulk actions', [page('/api-reference/bulk-actions/bulkGetItems')]),
        folder('Items', [page('/api-reference/items/listItems')]),
        page('/changelog'),
      ]),
    ],
  };
  const reference = regroupApiReference(tree).children[0] as PageTree.Folder;

  it('orders the API tag folders as the description lists its tags, and collapses them', () => {
    const tags = reference.children.filter(
      (node): node is PageTree.Folder => node.type === 'folder' && node.name !== 'Examples',
    );
    expect(tags.map((node) => node.name)).toEqual(['Items', 'Bulk actions']);
    expect(tags.every((node) => node.defaultOpen === false)).toBe(true);
  });

  it('leaves a folder that holds no API operation where it was, open and in its own order', () => {
    const examples = reference.children[1] as PageTree.Folder;
    expect(examples.name).toBe('Examples');
    expect(examples.defaultOpen).toBeUndefined();
    expect(examples.children.map((node) => (node as PageTree.Item).url)).toEqual(['/examples/b', '/examples/a']);
    expect(reference.children[0]).toEqual(page('/typescript-sdk'));
    expect(reference.children.at(-1)).toEqual(page('/changelog'));
  });
});
