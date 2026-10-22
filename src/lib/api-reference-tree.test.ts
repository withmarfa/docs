import type * as PageTree from 'fumadocs-core/page-tree';
import { describe, expect, it } from 'vitest';
import spec from '../../openapi.json';
import { isTagFolder, regroupApiReference } from './api-reference-tree';
import { source } from './source';

const page = (url: string): PageTree.Item => ({ type: 'page', name: url, url });
const folder = (name: string, children: PageTree.Node[]): PageTree.Folder => ({ type: 'folder', name, children });
const operationId = (node: PageTree.Node) => (node as PageTree.Item).url.split('/').pop();

describe('regroupApiReference', () => {
  const tree: PageTree.Root = {
    name: 'docs',
    children: [
      folder('Reference', [
        page('/typescript-sdk'),
        folder('Examples', [page('/examples/b'), page('/examples/a')]),
        folder('Api keys', [page('/api-reference/api-keys/updateKey'), page('/api-reference/api-keys/createKey')]),
        folder('Bulk actions', [page('/api-reference/bulk-actions/bulkGetItems')]),
        folder('Search', [page('/api-reference/search/zzUnlisted'), page('/api-reference/search/searchItems')]),
        folder('Items', [page('/api-reference/items/listItems'), page('/api-reference/items/createItem')]),
        page('/changelog'),
      ]),
    ],
  };
  const reference = regroupApiReference(tree).children[0] as PageTree.Folder;
  const tags = reference.children.filter(isTagFolder);

  it('orders the API tag folders as the description lists its tags, and collapses them', () => {
    expect(tags.map((node) => node.name)).toEqual(['Items', 'Bulk actions', 'Search', 'API keys']);
    expect(tags.every((node) => node.defaultOpen === false)).toBe(true);
  });

  it("names a group as the description does, not as its folder's path reads", () => {
    expect(tags.at(-1)?.name).toBe('API keys');
  });

  it("orders a group's operations by the tag's x-operation-order", () => {
    const items = tags.find((node) => node.name === 'Items')!;
    expect(items.children.map(operationId)).toEqual(['createItem', 'listItems']);
    const keys = tags.find((node) => node.name === 'API keys')!;
    expect(keys.children.map(operationId)).toEqual(['createKey', 'updateKey']);
  });

  it('puts an operation the order does not list last', () => {
    const search = tags.find((node) => node.name === 'Search')!;
    expect(search.children.map(operationId)).toEqual(['searchItems', 'zzUnlisted']);
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

describe("the API reference against the description's x-operation-order", () => {
  const reference = regroupApiReference(source.getPageTree()).children.find(
    (node): node is PageTree.Folder => node.type === 'folder' && node.children.some(isTagFolder),
  )!;
  const folders = reference.children.filter(isTagFolder);

  it('has a group for every tag, in the description order', () => {
    expect(folders.map((node) => node.name)).toEqual(spec.tags.map((tag) => tag.name));
  });

  it("lists each group's operations in its order, webhooks included", () => {
    for (const tag of spec.tags) {
      const group = folders.find((node) => node.name === tag.name)!;
      const order = (tag as { 'x-operation-order'?: string[] })['x-operation-order'] ?? [];
      expect(group.children.map(operationId), `the ${tag.name} group`).toEqual(order);
    }
  });

  it('names every operation that its group leaves out of the order, and every entry with no operation', () => {
    const problems: string[] = [];
    for (const tag of spec.tags) {
      const group = folders.find((node) => node.name === tag.name)!;
      const order = (tag as { 'x-operation-order'?: string[] })['x-operation-order'] ?? [];
      const pages = group.children.map(operationId);
      for (const id of pages) if (!order.includes(id!)) problems.push(`${tag.name}: ${id} is not in x-operation-order`);
      for (const id of order) if (!pages.includes(id)) problems.push(`${tag.name}: ${id} in x-operation-order has no page`);
    }
    expect(problems).toEqual([]);
  });
});
