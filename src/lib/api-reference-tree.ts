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

// The groups in the order the API description lists them, not alphabetically.
const TAG_ORDER = new Map(spec.tags.map((tag, index) => [tag.name, index]));

function tagRank(node: PageTree.Node): number {
  if (node.type !== 'folder') return -1;
  return TAG_ORDER.get(nodeName(node.name).trim()) ?? TAG_ORDER.size;
}

// A webhook is what Marfa sends, not a call you make, so it leads its group.
type Webhooks = Record<string, Record<string, { operationId?: string }>>;

const WEBHOOK_SLUGS = new Set(
  Object.entries((spec as { webhooks?: Webhooks }).webhooks ?? {})
    .flatMap(([name, item]) => [
      name,
      ...Object.values(item).map((op) => op.operationId ?? ''),
    ])
    .filter((slug) => slug.length > 0),
);

function webhookFirst(a: PageTree.Node, b: PageTree.Node): number {
  return Number(isWebhookPage(b)) - Number(isWebhookPage(a));
}

function isWebhookPage(node: PageTree.Node): boolean {
  return (
    node.type === 'page' && WEBHOOK_SLUGS.has(node.url.split('/').pop() ?? '')
  );
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
 * collapsed by default, ordered as the description lists its tags, lists its
 * webhooks first, and shows a method badge beside every operation.
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
                    defaultOpen: false,
                    children: [...child.children]
                      .sort(webhookFirst)
                      .map(decorateOperation),
                  }
                : child,
            ),
          }
        : node,
    ),
  };
}
