import type * as PageTree from 'fumadocs-core/page-tree';

// Group the API reference's pages. The hand-written MDX pages (overview,
// authentication, permissions, errors, rate limits) lead the sidebar as flat
// links with no section header; below them, five domain headers (separators)
// carry the generated resource folders.
//
// The resources stay collapsible — collapsed by default, with the active one
// auto-expanding — so the toggles are earned: each sits under a domain header
// and reveals that resource's endpoints. The lead pages are flat MDX pages,
// not folders, so they render with no header and no toggle.

// The General pages, in render order. Slugs match the MDX filenames in
// `content/docs/api-reference/` (the overview is the section index page, whose
// slug is the folder root — an empty trailing segment). These are authored
// pages, not generated operations, so they arrive as page nodes (the
// passthrough branch below), never folders.
const GENERAL_PAGES = [
  'authentication',
  'permissions',
  'errors',
  'rate-limits',
];

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
    resources: ['keys', 'auth', 'credentials', 'profile', 'spaces', 'admin'],
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

// Last URL segment of a page node, e.g. `/api-reference/errors` → `errors`.
// The section root (`/api-reference`) yields the empty string.
function urlSlug(url: string): string {
  const segs = url.replace(/\/+$/, '').split('/');
  return segs[segs.length - 1] ?? '';
}

function regroupTagFolders(children: PageTree.Node[]): PageTree.Node[] {
  const folderByName = new Map<string, PageTree.Folder>();
  const pageBySlug = new Map<string, PageTree.Item>();
  // The overview is the section's index page; its URL ends at the section root
  // (`/api-reference`), so it carries the empty slug. Pull it out by reference
  // rather than slug so it always leads the General section.
  let overview: PageTree.Item | undefined;
  const otherNodes: PageTree.Node[] = [];

  for (const node of children) {
    if (node.type === 'folder') {
      folderByName.set(nodeName(node.name).trim().toLowerCase(), {
        ...node,
        defaultOpen: false,
      });
      continue;
    }
    if (node.type === 'page') {
      const slug = urlSlug(node.url);
      if (slug === 'api-reference' || slug === '') {
        overview = node;
      } else {
        pageBySlug.set(slug, node);
      }
      continue;
    }
    otherNodes.push(node); // any pre-existing separator, etc.
  }

  // The lead pages: the overview, then the cross-cutting reference pages in
  // declared order. They render as flat links at the top of the sidebar (no
  // section header), so the API reference still reads as a self-contained
  // reference — the auth contract and error / rate-limit catalogue sit above
  // the resource sections.
  const leadPages: PageTree.Node[] = [];
  if (overview) leadPages.push(overview);
  for (const slug of GENERAL_PAGES) {
    const page = pageBySlug.get(slug);
    if (page) leadPages.push(page);
  }

  // The lead pages go in flat — no leading separator. A separator at the very
  // top carries a top margin meant to set a section off from what precedes it;
  // with nothing above, that became doubled dead space. The first separator is
  // now "Data model", sitting in its natural inter-section position.
  const out: PageTree.Node[] = [...otherNodes, ...leadPages];
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
  // silently vanishing — a signal to extend SECTIONS or GENERAL_PAGES. Covers
  // both resource folders missing from SECTIONS and authored MDX pages missing
  // from GENERAL_PAGES.
  const generalSet = new Set(GENERAL_PAGES);
  const leftovers: PageTree.Node[] = [
    ...[...pageBySlug.entries()]
      .filter(([slug]) => !generalSet.has(slug))
      .map(([, page]) => page),
    ...[...folderByName.entries()]
      .filter(([key]) => !placed.has(key))
      .map(([, folder]) => folder),
  ];
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
