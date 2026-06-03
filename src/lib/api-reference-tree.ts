import type * as PageTree from 'fumadocs-core/page-tree';

// Group the API reference's resource folders under five non-collapsible section
// headers (separators). The resources stay collapsible — collapsed by default,
// with the active one auto-expanding — so the toggles are earned: each sits
// under a domain header and reveals that resource's endpoints.

// Section headers in order, each listing its resources (lowercased tag names)
// in the order they should appear — primary resources first, not alphabetical.
// Casing here is lowercase so it matches regardless of how the tag is rendered.
const SECTIONS: { name: string; resources: string[] }[] = [
  {
    name: 'Data model',
    resources: ['items', 'edges', 'edge types', 'metadata', 'extensions', 'types'],
  },
  { name: 'Storage & search', resources: ['blobs', 'search', 'export'] },
  {
    name: 'Auth & accounts',
    resources: ['keys', 'auth', 'credentials', 'profile', 'tenants'],
  },
  {
    name: 'Connections & integrations',
    resources: ['connections', 'integrations', 'connection leased tokens'],
  },
  {
    name: 'Events & activity',
    resources: ['events', 'webhooks', 'inbound webhooks', 'audit'],
  },
];

function nodeName(name: PageTree.Node['name']): string {
  return typeof name === 'string' ? name : String(name ?? '');
}

function regroupTagFolders(children: PageTree.Node[]): PageTree.Node[] {
  const passthrough: PageTree.Node[] = [];
  const folderByName = new Map<string, PageTree.Folder>();

  for (const node of children) {
    if (node.type !== 'folder') {
      passthrough.push(node); // the "API overview" index page, etc.
      continue;
    }
    folderByName.set(nodeName(node.name).trim().toLowerCase(), {
      ...node,
      defaultOpen: false,
    });
  }

  const out: PageTree.Node[] = [...passthrough];
  const placed = new Set<string>();
  for (const section of SECTIONS) {
    const folders = section.resources
      .map((key) => {
        placed.add(key);
        return folderByName.get(key);
      })
      .filter((folder): folder is PageTree.Folder => Boolean(folder));
    if (folders.length) {
      out.push({ type: 'separator', name: section.name });
      out.push(...folders);
    }
  }
  // Anything unmapped stays visible under an explicit header rather than
  // silently vanishing — a signal to extend SECTIONS.
  const leftovers = [...folderByName.entries()]
    .filter(([key]) => !placed.has(key))
    .map(([, folder]) => folder);
  if (leftovers.length) {
    out.push({ type: 'separator', name: 'Other' });
    out.push(...leftovers);
  }
  return out;
}

/**
 * Return a copy of the page tree with the API reference tab's resource folders
 * grouped under section headers. All other tabs pass through unchanged.
 */
export function regroupApiReference(tree: PageTree.Root): PageTree.Root {
  return {
    ...tree,
    children: tree.children.map((node) =>
      node.type === 'folder' &&
      nodeName(node.name).trim().toLowerCase() === 'api reference'
        ? { ...node, children: regroupTagFolders(node.children) }
        : node,
    ),
  };
}
