import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { source } from './source';

const DOCS = path.resolve(__dirname, '../../content/docs');

// A page's address starts with its tab's segment. Home's segment is the root,
// so a Home page's address starts with no other tab's segment: `/`, `/quickstart`.
const TABS = ['use', 'run', 'build', 'catalog', 'reference'];

/** The tab a page's file sits in, from the first folder of its path, where a group in parentheses adds nothing to the address. */
function tabOf(file: string): string {
  const folder = file.split('/')[0];
  return folder.startsWith('(') ? folder.slice(1, -1) : file.includes('/') ? folder : 'home';
}

/** What is wrong with a page address given its tab, or `null` when it starts with the tab's segment. */
function addressProblem(url: string, tab: string, tabs: string[]): string | null {
  const first = url.split('/')[1];
  if (tab === 'home') return tabs.includes(first) ? `${url} is a Home page, so it must not start with another tab's segment (/${first})` : null;
  return first === tab ? null : `${url} is in the ${tab} tab, so it must start with /${tab}`;
}

describe('page addresses', () => {
  it('name the tabs in the order content/docs/meta.json gives them, Home first', () => {
    const listed = (JSON.parse(readFileSync(path.join(DOCS, 'meta.json'), 'utf8')) as { pages: string[] }).pages;
    expect(listed.map((folder) => (folder.startsWith('(') ? 'home' : folder))).toEqual(['home', ...TABS]);
  });

  it('every page starts with its own tab, and a Home page with no tab at all', () => {
    const pages = source.getPages();
    expect(pages.some((page) => page.type === 'openapi'), 'witness: the operation pages are checked').toBe(true);
    const problems = pages.map((page) => addressProblem(page.url, tabOf(page.path), TABS)).filter(Boolean);
    expect(problems).toEqual([]);
  });

  it('puts the landing page, Quickstart, Glossary, Changelog and Get help in Home', () => {
    for (const url of ['/', '/quickstart', '/connect-your-agent', '/how-marfa-works', '/glossary', '/changelog', '/get-help']) {
      const page = source.getPage(url === '/' ? [] : url.slice(1).split('/'));
      expect(page, url).toBeDefined();
      expect(tabOf(page!.path), url).toBe('home');
    }
  });

  it('every tab holds at least one page', () => {
    for (const tab of TABS) {
      expect(source.getPages().some((page) => page.url.startsWith(`/${tab}/`)), tab).toBe(true);
    }
  });

  it.each([
    ['/cli', 'reference'],
    ['/api-reference', 'reference'],
    ['/swift-sdk/items', 'reference'],
    ['/reference', 'build'],
    ['/docs/run/install', 'run'],
    ['/runx/install', 'run'],
    ['/reference/cli', 'home'],
    ['/use/sync-a-folder', 'home'],
  ])('refuses %s in the %s tab, which a page cannot have', (url, tab) => {
    expect(addressProblem(url, tab, TABS)).not.toBeNull();
  });

  it.each([
    ['/', 'home'],
    ['/glossary', 'home'],
    ['/quickstart', 'home'],
    ['/reference/api/items/list-items', 'reference'],
    ['/catalog/items', 'catalog'],
  ])('accepts %s in the %s tab', (url, tab) => {
    expect(addressProblem(url, tab, TABS)).toBeNull();
  });
});
