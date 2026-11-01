import { canonicalUrl } from '@/lib/canonical';
import { source } from '@/lib/source';

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * A sitemap of the given page paths at their canonical addresses, sorted and
 * without repeats. It has no `lastmod`: CI checks out one commit, so git cannot
 * say when a page last changed, and a wrong date is worse than none.
 */
export function sitemapXml(paths: string[]): string {
  const urls = [...new Set(paths.map(canonicalUrl))].sort();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

/** Every page: the written pages and the API reference operations. */
export function buildSitemap(): string {
  return sitemapXml(source.getPages().map((page) => page.url));
}
