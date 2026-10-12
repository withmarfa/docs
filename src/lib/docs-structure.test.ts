import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const CONTENT = path.join(ROOT, 'content/docs');
const GENERATED_CLI = path.join(ROOT, 'src/generated/cli');

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pages(full);
    return entry.name.endsWith('.mdx') ? [full] : [];
  });
}

const ALL_PAGES = pages(CONTENT).map((file) => ({
  file: path.relative(CONTENT, file),
  text: readFileSync(file, 'utf8'),
}));

describe('the CLI reference pages', () => {
  const included = (name: string) =>
    ALL_PAGES.filter(({ text }) => text.includes(`<include cwd>src/generated/cli/${name}</include>`)).map(
      ({ file }) => file,
    );

  it('show every command area the sync writes, each on exactly one page', () => {
    const areas = readdirSync(GENERATED_CLI).filter(
      (name) => name.endsWith('.md') && name !== 'global-options.md' && name !== 'exit-codes.md',
    );
    expect(areas.length).toBeGreaterThan(10);
    for (const area of areas) {
      const on = included(area);
      expect(on, `${area} is included by ${on.length} pages`).toHaveLength(1);
      expect(on[0].startsWith(path.join('(tools)', 'cli'))).toBe(true);
    }
  });

  it('show the global options and exit codes on the CLI page', () => {
    expect(included('global-options.md')).toEqual([path.join('(tools)', 'cli', 'index.mdx')]);
    expect(included('exit-codes.md')).toEqual([path.join('(tools)', 'cli', 'index.mdx')]);
  });
});

describe('the CLI download', () => {
  it('names the latest release wherever a page links to it', () => {
    const { version } = JSON.parse(readFileSync(path.join(ROOT, 'src/generated/marfa-release.json'), 'utf8'));
    const links = ALL_PAGES.flatMap(({ file, text }) =>
      [...text.matchAll(/releases\/download\/(v[0-9][^/]*)\/marfa-([^-]+)-darwin-arm64/g)].map((match) => ({
        file,
        tag: match[1],
        name: `v${match[2]}`,
      })),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.tag, `${link.file} links to ${link.tag}; the latest release is ${version}`).toBe(version);
      expect(link.name, `${link.file} names the archive of ${link.name}`).toBe(version);
    }
  });
});

describe('the Glossary page', () => {
  it('defines only words marfa\'s glossary uses', () => {
    const glossary = readFileSync(path.join(ROOT, 'src/generated/GLOSSARY.md'), 'utf8').toLowerCase();
    const page = ALL_PAGES.find(({ file }) => file === path.join('(tools)', 'glossary.mdx'))!;
    const words = [...page.text.matchAll(/^\| \*\*([^*]+)\*\* \|/gm)].map((match) => match[1]);
    expect(words.length).toBeGreaterThan(20);
    for (const word of words) {
      const pattern = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      expect(pattern.test(glossary), `"${word}" is not in GLOSSARY.md`).toBe(true);
    }
  });
});
