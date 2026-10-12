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
  it('comes from the generated snippet, so a release sync updates it', () => {
    const hardCoded = ALL_PAGES.filter(({ text }) => text.includes('releases/download/')).map(({ file }) => file);
    expect(hardCoded).toEqual([]);
    const including = ALL_PAGES.filter(({ text }) =>
      text.includes('<include cwd>src/generated/cli-download.md</include>'),
    ).map(({ file }) => file);
    expect(including.sort()).toEqual([path.join('(overview)', 'quickstart.mdx'), path.join('(tools)', 'cli', 'index.mdx')]);
  });

  it('names the latest release', () => {
    const { version } = JSON.parse(readFileSync(path.join(ROOT, 'src/generated/marfa-release.json'), 'utf8'));
    const snippet = readFileSync(path.join(ROOT, 'src/generated/cli-download.md'), 'utf8');
    expect(snippet).toContain(`/releases/download/${version}/marfa-${version.slice(1)}-darwin-arm64.tar.gz`);
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
