import type * as PageTree from 'fumadocs-core/page-tree';
import {
  Children,
  Fragment,
  createElement,
  isValidElement,
  type ReactNode,
} from 'react';
import { ApiMethod, parseApiMethod } from '@/components/api-method';
import spec from '../../openapi.json';

// The title of the Reference tab's folder, from its meta.json, lowercased. The
// API's tag folders are the only folders in that tab.
const REFERENCE_TITLE = 'reference';

// The description's tags: the groups in the order it lists them, each with the
// order of its operations. An operation page lives at
// /api-reference/<tag-slug>/<operationId>, with the slug fumadocs-openapi
// makes from the tag's name, so a folder is matched to its tag by that slug and
// not by the folder's display name, which the loader derives from the slug
// ("Api keys" for the tag "API keys").
type Tag = { name: string; 'x-operation-order'?: string[] };

const tagSlug = (name: string) => name.replace(/\s+/g, '-').toLowerCase();

const TAGS = new Map(
  (spec.tags as Tag[]).map((tag, index) => [
    tagSlug(tag.name),
    { name: tag.name, index, order: new Map((tag['x-operation-order'] ?? []).map((id, position) => [id, position])) },
  ]),
);

function folderTag(folder: PageTree.Folder) {
  for (const child of folder.children) {
    if (child.type !== 'page' || !child.url.startsWith('/api-reference/')) continue;
    return TAGS.get(child.url.split('/')[2] ?? '');
  }
  return undefined;
}

function tagRank(node: PageTree.Node): number {
  if (node.type !== 'folder') return -1;
  return folderTag(node)?.index ?? TAGS.size;
}

// An operation the tag's x-operation-order leaves out sorts last, in the order
// the loader gave it. The tests name it.
function orderOperations(folder: PageTree.Folder): PageTree.Node[] {
  const order = folderTag(folder)?.order;
  const rank = (node: PageTree.Node) =>
    (node.type === 'page' ? order?.get(node.url.split('/').pop() ?? '') : undefined) ?? Number.MAX_SAFE_INTEGER;
  return [...folder.children].sort((a, b) => rank(a) - rank(b));
}

// A folder of operations generated for one tag. The Reference tab may hold
// other folders, which keep their place and their pages' order.
export function isTagFolder(node: PageTree.Node): node is PageTree.Folder {
  return (
    node.type === 'folder' &&
    node.children.some((child) => child.type === 'page' && child.url.startsWith('/api-reference/'))
  );
}

// Orders the tag folders and leaves every other entry, such as the index and
// errors pages, where the folder's meta.json put it.
function sortTagFoldersInPlace(
  nodes: PageTree.Node[],
  rank: (node: PageTree.Node) => number,
): PageTree.Node[] {
  const folders = nodes.filter(isTagFolder).sort((a, b) => rank(a) - rank(b));
  return nodes.map((node) => (isTagFolder(node) ? folders.shift()! : node));
}

function nodeName(name: PageTree.Node['name']): string {
  return typeof name === 'string' ? name : String(name ?? '');
}

function decorateOperationName(name: PageTree.Item['name']): PageTree.Item['name'] {
  if (!isValidElement<{ children?: ReactNode }>(name)) return name;

  const children = Children.toArray(name.props.children);
  const methodIndex = children.findIndex((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return false;
    return parseApiMethod(child.props.children) !== undefined;
  });
  if (methodIndex === -1) return name;

  const methodNode = children[methodIndex];
  if (!isValidElement<{ children?: ReactNode }>(methodNode)) return name;
  const method = parseApiMethod(methodNode.props.children);
  if (!method) return name;

  const title = children.filter(
    (child, index) =>
      index !== methodIndex &&
      (typeof child !== 'string' || child.trim().length > 0),
  );

  return createElement(
    Fragment,
    null,
    createElement(ApiMethod, {
      key: 'method',
      method,
    }),
    ...title,
  );
}

function decorateOperation(node: PageTree.Node): PageTree.Node {
  return node.type === 'page'
    ? { ...node, name: decorateOperationName(node.name) }
    : node;
}

/**
 * Return a copy of the page tree where each tag folder in the Reference tab is
 * collapsed by default, ordered and named as the description lists its tags,
 * lists its operations in the tag's `x-operation-order` (webhooks included), and
 * shows a method badge beside every operation.
 */
export function regroupApiReference(tree: PageTree.Root): PageTree.Root {
  return {
    ...tree,
    children: tree.children.map((node) =>
      node.type === 'folder' &&
      nodeName(node.name).trim().toLowerCase() === REFERENCE_TITLE
        ? {
            ...node,
            children: sortTagFoldersInPlace(node.children, tagRank).map((child) =>
              isTagFolder(child)
                ? {
                    ...child,
                    name: folderTag(child)?.name ?? child.name,
                    defaultOpen: false,
                    children: orderOperations(child).map(decorateOperation),
                  }
                : child,
            ),
          }
        : node,
    ),
  };
}
