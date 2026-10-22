import { appName } from '@/lib/shared';

type PageHeadData = { title: string; description: string; markdownUrl: string };

/**
 * The head of a page. Without a title of its own every page reads as the site
 * name in search results and link previews, because the root route's title is
 * the only one. Operation descriptions are Markdown, so their backticks are
 * dropped from the meta text. The alternate link tells a client that read the
 * HTML where the Markdown copy of the same page is.
 */
export function pageHead(data: PageHeadData | undefined) {
  if (!data) return { meta: [], links: [] };
  return {
    meta: [
      { title: `${data.title} | ${appName}` },
      ...(data.description
        ? [{ name: 'description', content: data.description.replace(/`/g, '') }]
        : []),
    ],
    links: [{ rel: 'alternate', type: 'text/markdown', href: data.markdownUrl }],
  };
}
