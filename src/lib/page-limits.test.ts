/**
 * Holds every page to a word limit (STYLE.md, "Less is clearer"). The words
 * are those of the MDX after the frontmatter, code included and includes not
 * expanded. A page's limit comes from its kind, which its folder decides
 * unless `page-limits.json` names the page, and a lookup page has a limit of
 * its own with a reason. A page over its limit today has a ceiling under
 * "pending", which only a rewrite removes: the test fails when such a page
 * grows, and when an entry no longer excuses anything.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import config from './page-limits.json';

const CONTENT_DIR = fileURLToPath(new URL('../../content/docs', import.meta.url));

interface Entry {
  kind?: string;
  limit?: number;
  reason?: string;
}

export interface Limits {
  kinds: Record<string, number>;
  folders: Record<string, Entry>;
  pages: Record<string, Entry>;
  pending: Record<string, { ceiling: number; reason: string }>;
}

export const WHAT_TO_DO = 'Split the page, move detail to the reference, or cut it.';

/** The words of a page's MDX after its frontmatter: anything between spaces, code included. */
export function countWords(text: string): number {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  return body.split(/\s+/).filter(Boolean).length;
}

/** The limit that applies to a page, with its kind, or a message when nothing says. */
export function limitFor(file: string, limits: Limits): { limit: number; kind: string } | string {
  let entry: Entry | undefined = limits.pages[file];
  if (!entry) {
    // The longest folder that holds the page decides.
    const folder = Object.keys(limits.folders)
      .filter((name) => file.startsWith(`${name}/`))
      .sort((a, b) => b.length - a.length)[0];
    entry = folder ? limits.folders[folder] : undefined;
  }
  if (!entry) return `${file} has no kind. Add its folder or the page to page-limits.json.`;
  if (entry.limit !== undefined) {
    if (!entry.reason) return `${file}: the limit of ${entry.limit} words in page-limits.json has no reason.`;
    return { limit: entry.limit, kind: 'lookup page' };
  }
  const limit = entry.kind === undefined ? undefined : limits.kinds[entry.kind];
  if (limit === undefined) return `${file}: "${entry.kind}" in page-limits.json is not a kind.`;
  return { limit, kind: entry.kind! };
}

/** What is wrong with the pages' lengths, one message each. An empty list means every page is within its limit. */
export function checkPageLimits(pages: { file: string; words: number }[], limits: Limits): string[] {
  const problems: string[] = [];
  const files = new Set(pages.map((page) => page.file));

  for (const { file, words } of pages) {
    const found = limitFor(file, limits);
    if (typeof found === 'string') {
      problems.push(found);
      continue;
    }
    const excuse = limits.pending[file];
    if (words <= found.limit) {
      if (excuse) problems.push(`${file} is ${words} words, within its limit of ${found.limit}. Remove its entry from "pending" in page-limits.json.`);
    } else if (!excuse) {
      problems.push(`${file} is ${words} words, over the limit of ${found.limit} for a ${found.kind}. ${WHAT_TO_DO}`);
    } else if (words > excuse.ceiling) {
      problems.push(
        `${file} is ${words} words, over its ceiling of ${excuse.ceiling} while it waits for a rewrite (the limit for a ${found.kind} is ${found.limit}). ${WHAT_TO_DO}`,
      );
    }
  }

  for (const file of Object.keys(limits.pending)) {
    if (!files.has(file)) problems.push(`"pending" in page-limits.json names ${file}, which is not a page. Remove the entry.`);
    else if (!limits.pending[file].reason) problems.push(`The "pending" entry for ${file} has no reason.`);
  }
  for (const file of Object.keys(limits.pages)) {
    if (!files.has(file)) problems.push(`"pages" in page-limits.json names ${file}, which is not a page. Remove the entry.`);
  }
  for (const folder of Object.keys(limits.folders)) {
    if (![...files].some((file) => file.startsWith(`${folder}/`))) {
      problems.push(`"folders" in page-limits.json names ${folder}, which holds no page. Remove the entry.`);
    }
  }
  return problems;
}

function listPages(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith('.mdx'))
    .map((entry) => entry.split(path.sep).join('/'))
    .sort();
}

describe('page limits: the pages', () => {
  const pages = listPages(CONTENT_DIR).map((file) => ({
    file,
    words: countWords(readFileSync(path.join(CONTENT_DIR, file), 'utf8')),
  }));

  it('finds the pages', () => {
    expect(pages.length).toBeGreaterThan(50);
    expect(pages.every((page) => page.words > 0)).toBe(true);
  });

  it('keeps every page within its limit, or at or under its ceiling while a rewrite is pending', () => {
    expect(checkPageLimits(pages, config as Limits)).toEqual([]);
  });
});

describe('page limits: each check fires on a bad sample', () => {
  const limits: Limits = {
    kinds: { concept: 10, guide: 20 },
    folders: { a: { kind: 'concept' }, b: { kind: 'guide' }, 'b/deep': { limit: 5, reason: 'Lookup.' } },
    pages: { 'a/lookup.mdx': { limit: 30, reason: 'Lookup.' } },
    pending: {},
  };
  // Pages that keep each sample entry in use, so only the check under test fires.
  const anchors: [string, number][] = [['a/lookup.mdx', 1], ['b/x.mdx', 1], ['b/deep/y.mdx', 1]];
  const run = (pages: [string, number][], over: Partial<Limits> = {}) => {
    const names = new Set(pages.map(([file]) => file));
    const all = [...pages, ...anchors.filter(([file]) => !names.has(file))];
    return checkPageLimits(all.map(([file, words]) => ({ file, words })), { ...limits, ...over });
  };

  it('counts the words after the frontmatter, code included', () => {
    expect(countWords('---\ntitle: A title\ndescription: Some words here.\n---\n\nOne two\n\n```bash\nthree four\n```\n')).toBe(6);
    expect(countWords('No frontmatter here.')).toBe(3);
    expect(countWords('---\ntitle: T\n---\nBody\n\n---\n\nmore')).toBe(3);
  });

  it('fails a page over its kind\'s limit and names the page, its count, the limit and what to do', () => {
    const [message] = run([['a/page.mdx', 11], ['b/page.mdx', 20]]);
    expect(message).toContain('a/page.mdx');
    expect(message).toContain('11 words');
    expect(message).toContain('limit of 10 for a concept');
    expect(message).toContain(WHAT_TO_DO);
    expect(run([['a/page.mdx', 10]])).toEqual([]);
  });

  it('takes the page\'s own entry over its folder, and the deepest folder over a shallower one', () => {
    expect(run([['a/lookup.mdx', 30]])).toEqual([]);
    expect(run([['a/lookup.mdx', 31]])).toHaveLength(1);
    expect(run([['b/deep/x.mdx', 6]])[0]).toContain('limit of 5 for a lookup page');
  });

  it('fails a page that no entry covers, and an entry that has no reason or no such kind', () => {
    expect(run([['c/page.mdx', 1]])[0]).toContain('has no kind');
    expect(run([['a/page.mdx', 1]], { pages: { ...limits.pages, 'a/page.mdx': { limit: 5 } } })[0]).toContain('has no reason');
    expect(run([['a/page.mdx', 1]], { pages: { ...limits.pages, 'a/page.mdx': { kind: 'essay' } } })[0]).toContain('not a kind');
  });

  it('lets a pending page stay at its ceiling, and fails it above', () => {
    const pending = { 'a/page.mdx': { ceiling: 50, reason: 'rewrite pending' } };
    expect(run([['a/page.mdx', 50]], { pending })).toEqual([]);
    expect(run([['a/page.mdx', 40]], { pending })).toEqual([]);
    const [message] = run([['a/page.mdx', 51]], { pending });
    expect(message).toContain('51 words');
    expect(message).toContain('ceiling of 50');
  });

  it('fails an entry that no longer excuses anything', () => {
    const pending = { 'a/page.mdx': { ceiling: 50, reason: 'rewrite pending' } };
    expect(run([['a/page.mdx', 10]], { pending })[0]).toContain('Remove its entry from "pending"');
    expect(run([['a/other.mdx', 10]], { pending })[0]).toContain('not a page');
    expect(run([['a/page.mdx', 20]], { pending: { 'a/page.mdx': { ceiling: 50, reason: '' } } })[0]).toContain('has no reason');
  });

  it('fails a page or folder entry for something that is gone', () => {
    expect(run([['a/page.mdx', 1]], { pages: { ...limits.pages, 'a/gone.mdx': { kind: 'concept' } } })[0]).toContain('not a page');
    expect(run([['a/page.mdx', 1]], { folders: { ...limits.folders, gone: { kind: 'concept' } } })[0]).toContain('holds no page');
  });
});
