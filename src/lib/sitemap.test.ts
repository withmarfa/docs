import { describe, expect, it } from 'vitest';
import { buildSitemap, sitemapXml } from './sitemap';
import { source } from './source';

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);

describe('sitemapXml', () => {
  it('lists canonical addresses, sorted, once each', () => {
    const xml = sitemapXml(['/run/deploy', '/quickstart/', '/quickstart']);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
    expect(locs(xml)).toEqual(['https://docs.marfa.so/quickstart', 'https://docs.marfa.so/run/deploy']);
  });

  it('escapes what XML reserves', () => {
    expect(locs(sitemapXml(["/a&b'c"]))).toEqual(['https://docs.marfa.so/a&#38;b&#39;c']);
  });
});

describe('buildSitemap', () => {
  const urls = locs(buildSitemap());

  it('lists every page, written and API reference', () => {
    expect(urls).toHaveLength(source.getPages().length);
    expect(urls).toContain('https://docs.marfa.so/');
    expect(urls).toContain('https://docs.marfa.so/quickstart');
    expect(urls).toContain('https://docs.marfa.so/run/deploy');
    expect(urls.some((url) => url.startsWith('https://docs.marfa.so/api-reference/'))).toBe(true);
  });

  it('lists only page addresses', () => {
    for (const url of urls.filter((url) => url !== 'https://docs.marfa.so/')) {
      expect(url).not.toMatch(/\/$|\.md$|\.txt$|\/mcp$|\/api\/|version\.json/);
    }
  });
});
