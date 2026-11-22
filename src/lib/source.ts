import { loader } from 'fumadocs-core/source';
import type * as PageTree from 'fumadocs-core/page-tree';
import { docs } from 'collections/server';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsRoute } from './shared';
import { openapi } from './openapi';
import rawSpec from '../../openapi.json';
import { sidebarLabelPlugin } from './sidebar-label';
import { unlinkMissingPages } from './changelog';

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({ baseDir: 'reference/api', groupBy: 'tag' }),
  },
  {
    baseUrl: docsRoute,
    plugins: [openapi.loaderPlugin(), lucideIconsPlugin(), sidebarLabelPlugin()],
  },
);

const operationTags = new Map(
  Object.values(rawSpec.paths as Record<string, Record<string, { operationId?: string; tags?: string[] }>>).flatMap(
    (item) => Object.values(item).flatMap((op) => (op.operationId && op.tags?.[0] ? [[op.operationId, op.tags[0]] as const] : [])),
  ),
);

/**
 * The name in browser tabs and search results of an operation page whose
 * summary another page shares: the summary with its tag. An operation page has
 * no frontmatter to set `headTitle` in, and two operations under different
 * tags may share a summary.
 */
export function operationHeadTitle(page: (typeof source)['$inferPage']): string | undefined {
  if (page.type !== 'openapi') return undefined;
  const title = page.data.title ?? '';
  const tag = operationTags.get(page.slugs.at(-1) ?? '');
  const shared = source.getPages().some((other) => other.url !== page.url && other.data.title === title);
  return shared && tag ? `${title} (${tag})` : undefined;
}

export function markdownPathToSlugs(segs: string[]) {
  if (segs.length === 0) return [];

  const out = [...segs];
  out[out.length - 1] = out[out.length - 1].replace(/\.md$/, '');
  if (out.length === 1 && out[0] === 'index') out.pop();
  return out;
}

/**
 * The page a name reads as, for the Markdown copy and the docs tools: the page
 * at that path, or, for a single name such as `connect-your-agent` that is no
 * path, the page whose address ends in it. Where several end in it, the one
 * nearest the root wins, so `cli` is the CLI reference and not a troubleshooting
 * page; two at the same depth find neither, so a lookup never guesses. This
 * keeps a name that the CLI and the install message print working while pages
 * sit under their tab. A page's own address is unchanged and the HTML site has
 * no alias.
 */
export function findPage(slugs: string[]) {
  const exact = source.getPage(slugs);
  if (exact || slugs.length !== 1) return exact;
  const ending = source.getPages().filter((page) => page.slugs.at(-1) === slugs[0]);
  const nearest = Math.min(...ending.map((page) => page.slugs.length));
  const nearestPages = ending.filter((page) => page.slugs.length === nearest);
  return nearestPages.length === 1 ? nearestPages[0] : undefined;
}

export function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.md');
  } else {
    segments[segments.length - 1] += '.md';
  }

  return {
    segments,
    url: `${docsRoute}/${segments.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  // OpenAPI pages are virtual and carry no source markdown.
  const text =
    'getText' in page.data ? await page.data.getText('processed') : (page.data.description ?? '');
  // Old release notes link removed pages; the page draws those as text, so the copy does too.
  const body =
    page.url === '/changelog' ? unlinkMissingPages(text, new Set(source.getPages().map((p) => p.url))) : text;

  // The page's lead and, on a Catalog type page, its identifier, which the
  // header shows from frontmatter rather than the body.
  const lead = 'getText' in page.data && page.data.description ? `${page.data.description}\n\n` : '';
  const identifier = 'identifier' in page.data && page.data.identifier ? `Identifier: \`${page.data.identifier}\`\n\n` : '';
  return `# ${page.data.title} (${page.url})

${lead}${identifier}${body}`;
}

/** The Markdown copy of a page as a response: the one body `<page>.md` and a page address that asks for Markdown both serve. */
export async function markdownResponse(page: (typeof source)['$inferPage'], headers: HeadersInit = {}) {
  return new Response(await getLLMText(page), {
    headers: { 'Content-Type': 'text/markdown', ...headers },
  });
}

/**
 * The page a request path addresses, with or without one trailing slash, or
 * `undefined` for a `.md` copy and anything that is not a page. `/` is the
 * landing page.
 */
export function pageForPath(pathname: string) {
  if (pathname === '/') return source.getPage([]);
  const segments = pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
  if (segments.some((segment) => segment === '')) return undefined;
  try {
    return source.getPage(segments.map(decodeURIComponent));
  } catch {
    return undefined;
  }
}

/**
 * Whether `llms-full.txt` holds a page. It holds the written pages. The
 * generated operation pages, whose copies hold only a title and a description,
 * and the changelog stay out; each keeps its own `.md` copy.
 */
export function inLlmsFull(page: (typeof source)['$inferPage']) {
  return page.type !== 'openapi' && page.url !== '/changelog';
}

/** Page addresses in sidebar order: each tab, then its folders' landing pages and pages as they appear. */
function sidebarOrder(): Map<string, number> {
  const order = new Map<string, number>();
  const add = (url: string) => {
    if (!order.has(url)) order.set(url, order.size);
  };
  const walk = (nodes: PageTree.Node[]) => {
    for (const node of nodes) {
      if (node.type === 'page') add(node.url);
      else if (node.type === 'folder') {
        if (node.index) add(node.index.url);
        walk(node.children);
      }
    }
  };
  walk(source.getPageTree().children);
  return order;
}

/** The written pages in the sidebar's order, as `llms.txt` lists them; a page outside the tree goes last. */
export async function getLlmsFullText() {
  const order = sidebarOrder();
  const rank = (page: (typeof source)['$inferPage']) => order.get(page.url) ?? Number.MAX_SAFE_INTEGER;
  const pages = source
    .getPages()
    .filter(inLlmsFull)
    .sort((a, b) => rank(a) - rank(b));
  return (await Promise.all(pages.map(getLLMText))).join('\n\n');
}
