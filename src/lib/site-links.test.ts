import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type * as PageTree from 'fumadocs-core/page-tree';
import { describe, expect, it } from 'vitest';
import { SECTIONS } from '@/components/section-nav';
import { pathToSlugs } from './docs-tools';
import { source } from './source';

const ROOT = path.resolve(__dirname, '../..');
const DOCS = path.join(ROOT, 'content/docs');

// The site code's own links to pages: the header, the section pills, the
// error pages and the sidebar footer. The content lint covers the pages' links;
// these sit outside any page, so a renamed page could leave one behind.
const LINK = /\b(?:href|primaryHref|secondaryHref|url)\s*[=:]\s*["'`](\/[^"'`]*)["'`]/g;
const STATIC_FILE = /\.[a-z0-9]+$/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' || entry.name === 'status' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('links in the site code', () => {
  const links = sourceFiles(path.join(ROOT, 'src')).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(LINK)]
      .map((match) => match[1].replace(/[#?].*$/, ''))
      .filter((url) => !STATIC_FILE.test(url))
      .map((url) => ({ file: path.relative(ROOT, file), url })),
  );

  it('finds the header and section links', () => {
    expect(links.some(({ url }) => url === '/')).toBe(true);
    expect(links.some(({ url }) => url === '/catalog/items')).toBe(true);
  });

  it.each(links.map(({ file, url }) => [url, file]))('%s in %s reaches a page', (url) => {
    expect(source.getPage(pathToSlugs(url)), url).toBeDefined();
  });
});

describe('the section pills', () => {
  const tabs = (JSON.parse(readFileSync(path.join(DOCS, 'meta.json'), 'utf8')) as { pages: string[] }).pages.map(
    (folder) => JSON.parse(readFileSync(path.join(DOCS, folder, 'meta.json'), 'utf8')) as { title: string; pages: string[] },
  );

  it('name the tabs in the order content/docs/meta.json gives them', () => {
    expect(SECTIONS.map((section) => section.label)).toEqual(tabs.map((tab) => tab.title));
  });

  // A tab opens on the first page its sidebar lists; no tab has a landing page of its own.
  const firstPage = (nodes: PageTree.Node[]): string | undefined => {
    for (const node of nodes) {
      if (node.type === 'page') return node.url;
      if (node.type === 'folder') {
        const url = node.index?.url ?? firstPage(node.children);
        if (url) return url;
      }
    }
    return undefined;
  };

  it('open each tab on the first page of its sidebar', () => {
    const folders = source.getPageTree().children.filter((node) => node.type === 'folder');
    expect(folders.map((folder) => folder.name)).toEqual(tabs.map((tab) => tab.title));
    for (const [index, section] of SECTIONS.entries()) {
      expect(source.getPage(pathToSlugs(section.href)), section.href).toBeDefined();
      const folder = folders[index] as PageTree.Folder;
      expect(section.href, section.label).toBe(folder.index?.url ?? firstPage(folder.children));
    }
  });
});
