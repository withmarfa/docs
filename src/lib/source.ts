import { loader } from 'fumadocs-core/source';
import type * as PageTree from 'fumadocs-core/page-tree';
import { docs } from 'collections/server';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsRoute } from './shared';
import { openapi } from './openapi';

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({ baseDir: '(reference)/api-reference', groupBy: 'tag' }),
  },
  {
    baseUrl: docsRoute,
    plugins: [openapi.loaderPlugin(), lucideIconsPlugin()],
  },
);

export function markdownPathToSlugs(segs: string[]) {
  if (segs.length === 0) return [];

  const out = [...segs];
  out[out.length - 1] = out[out.length - 1].replace(/\.md$/, '');
  if (out.length === 1 && out[0] === 'index') out.pop();
  return out;
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
  const body =
    'getText' in page.data ? await page.data.getText('processed') : (page.data.description ?? '');

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
 * `undefined` for the root, a `.md` copy and anything that is not a page.
 */
export function pageForPath(pathname: string) {
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
