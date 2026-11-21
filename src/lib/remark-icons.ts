import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type Connector, readConnectors } from './connectors';
import { type IconData, resolveIcon } from './icons';

/**
 * Where the Catalog shows an icon, and nowhere else. A Catalog type shows the
 * icon its own `display_hints.icon` names: in its page heading and beside its
 * name in the Types list. A connector shows the mark its `sourceMark` names: in
 * its page heading and in the Mark column of the connector index. A type or
 * connector with no icon shows none. The icons are resolved here, while the page
 * compiles, from the pinned Iconify sets (`src/lib/icons.ts`).
 *
 * A page heading is outside the page's MDX, so the icon leaves the plugin as
 * the `pageIcon` export, which the route draws before the title.
 */

/** What the plugin reads: a built-in type's icon ID by type ID, and the connectors. */
export interface IconSources {
  typeIcons: Map<string, string>;
  connectors: Connector[];
}

export function readIconSources(root: string = process.cwd()): IconSources {
  const catalog = JSON.parse(readFileSync(path.join(root, 'src/generated/catalog/builtin-catalog.json'), 'utf8')) as {
    types: { id: string; display_hints?: { icon?: string } }[];
  };
  const typeIcons = new Map<string, string>();
  for (const type of catalog.types) {
    if (type.display_hints?.icon) typeIcons.set(type.id, type.display_hints.icon);
  }
  return { typeIcons, connectors: readConnectors(root) };
}

/** The part of a syntax tree node this file reads or writes. */
interface Node {
  type: string;
  value?: string;
  url?: string;
  name?: string | null;
  attributes?: { type: 'mdxJsxAttribute'; name: string; value: string }[];
  children?: Node[];
}

/** `markdown` is what the Markdown copy keeps in the icon's place: nothing, unless a page gives it. */
function iconNode(icon: IconData, markdown?: string): Node {
  return {
    type: 'mdxJsxTextElement',
    name: 'Icon',
    attributes: [
      { type: 'mdxJsxAttribute', name: 'body', value: icon.body },
      { type: 'mdxJsxAttribute', name: 'width', value: String(icon.width) },
      { type: 'mdxJsxAttribute', name: 'height', value: String(icon.height) },
      ...(markdown ? [{ type: 'mdxJsxAttribute' as const, name: 'markdown', value: markdown }] : []),
    ],
    children: [],
  };
}

function text(node: Node): string {
  return node.value ?? (node.children ?? []).map(text).join('');
}

/** The path of a file under `content/docs`, or undefined for any other file. */
function pagePath(file: string | undefined): string | undefined {
  const marker = '/content/docs/';
  const at = file?.lastIndexOf(marker) ?? -1;
  return file && at >= 0 ? file.slice(at + marker.length) : undefined;
}

function resolveSource(read: () => IconSources) {
  let sources: IconSources | undefined;
  return () => (sources ??= read());
}

/** A type's icon in the first cell of a row that names it as a link to its page: `[`core.note`](/catalog/note)`. */
function typeCellIcon(cell: Node, sources: IconSources): IconData | undefined {
  const [link, ...rest] = cell.children ?? [];
  if (rest.length > 0 || link?.type !== 'link' || link.children?.length !== 1 || link.children[0].type !== 'inlineCode') {
    return undefined;
  }
  const id = link.children[0].value ?? '';
  const icon = sources.typeIcons.get(id);
  return icon && link.url === `/catalog/${id.split('.')[1]}` ? resolveIcon(icon) : undefined;
}

export function remarkIcons(read: () => IconSources = () => readIconSources()) {
  return () => {
    const sources = resolveSource(read);
    return (tree: Node, file: { path?: string; data: Record<string, unknown> }) => {
      const page = pagePath(file.path);
      if (!page?.startsWith('catalog/')) return;
      const { typeIcons, connectors } = sources();

      const connectorPage = /^catalog\/connectors\/([^/]+)\.mdx?$/.exec(page)?.[1];
      if (connectorPage && connectorPage !== 'index') {
        const connector = connectors.find((item) => item.name === connectorPage);
        if (!connector) {
          throw new Error(
            `${page} is a connector page, but the plugins repository lists no connector named "${connectorPage}". ` +
              'Name the page for a connector, or remove it.',
          );
        }
        if (connector.sourceMark) file.data.pageIcon = resolveIcon(connector.sourceMark);
      }

      const identifier = (file.data.frontmatter as { identifier?: unknown } | undefined)?.identifier;
      const typeIcon = typeof identifier === 'string' ? typeIcons.get(identifier) : undefined;
      if (typeIcon) file.data.pageIcon = resolveIcon(typeIcon);

      const visit = (node: Node) => {
        if (node.type === 'table') {
          const [head, ...rows] = node.children ?? [];
          const first = text(head?.children?.[0] ?? { type: 'text' }).trim();
          for (const row of rows) {
            const cell = row.children?.[0];
            if (!cell) continue;
            if (first === 'Mark') {
              // The cell holds the mark's ID as code, so the Markdown copy keeps it.
              const [code, ...rest] = cell.children ?? [];
              if (rest.length === 0 && code?.type === 'inlineCode') cell.children = [iconNode(resolveIcon(code.value ?? ''), code.value)];
            } else {
              const icon = typeCellIcon(cell, { typeIcons, connectors });
              if (icon) cell.children = [iconNode(icon), ...(cell.children ?? [])];
            }
          }
          return;
        }
        node.children?.forEach(visit);
      };
      visit(tree);
    };
  };
}
