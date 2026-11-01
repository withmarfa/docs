import { canonicalUrl } from '@/lib/canonical';
import { appName } from '@/lib/shared';

type PageHeadData = { title: string; headTitle?: string; description: string; url: string; markdownUrl: string };

/**
 * A page's name in browser tabs, search results and link previews: its
 * `headTitle` when it has one, else its title. Every tab opens on a page titled
 * Overview, so those pages set `headTitle` to tell them apart. The site name
 * follows, unless the name already starts with it, as the landing page's does.
 */
export function headTitle(data: Pick<PageHeadData, 'title' | 'headTitle'>): { title: string; ogTitle: string } {
  const ogTitle = data.headTitle ?? data.title;
  return { ogTitle, title: ogTitle.startsWith(appName) ? ogTitle : `${ogTitle} | ${appName}` };
}

/**
 * The head of a page. Without a title of its own every page reads as the site
 * name in search results and link previews, because the root route's title is
 * the only one. Operation descriptions are Markdown, so their backticks are
 * dropped from the meta text. The canonical link and `og:url` give search
 * engines and link previews one absolute address for the page, whatever host
 * or form of the path served it. The root route sets the share image and the
 * other Open Graph tags every page has, and these override its title and
 * description. The alternate link tells a client that read the HTML where the
 * Markdown copy of the same page is.
 */
export function pageHead(data: PageHeadData | undefined) {
  if (!data) return { meta: [], links: [] };
  const description = data.description.replace(/`/g, '');
  const url = canonicalUrl(data.url);
  const { title, ogTitle } = headTitle(data);
  return {
    meta: [
      { title },
      ...(description
        ? [
            { name: 'description', content: description },
            { property: 'og:description', content: description },
          ]
        : []),
      { property: 'og:title', content: ogTitle },
      { property: 'og:url', content: url },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'alternate', type: 'text/markdown', href: data.markdownUrl },
    ],
  };
}
