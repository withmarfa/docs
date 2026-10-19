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

describe('the CLI page', () => {
  const CLI_PAGE = path.join('(reference)', 'cli.mdx');
  const included = (name: string) =>
    ALL_PAGES.filter(({ text }) => text.includes(`<include cwd>src/generated/cli/${name}</include>`)).map(
      ({ file }) => file,
    );

  it('is the only page that shows the global options and exit codes, the two files the sync writes', () => {
    expect(readdirSync(GENERATED_CLI).sort()).toEqual(['exit-codes.md', 'global-options.md']);
    expect(included('global-options.md')).toEqual([CLI_PAGE]);
    expect(included('exit-codes.md')).toEqual([CLI_PAGE]);
  });
});

describe('the lists the Catalog holds', () => {
  const LISTS = ['edge-types.md', 'permissions.md', 'event-types.md'];

  it('are included on Catalog pages only', () => {
    const outside = ALL_PAGES.filter(
      ({ file, text }) =>
        !file.startsWith(`catalog${path.sep}`) && LISTS.some((list) => text.includes(`src/generated/${list}`)),
    ).map(({ file }) => file);
    expect(outside).toEqual([]);
  });
});

describe('the CLI download', () => {
  it('comes from the generated snippet, so a release sync updates it', () => {
    const hardCoded = ALL_PAGES.filter(({ text }) => text.includes('releases/download/')).map(({ file }) => file);
    expect(hardCoded).toEqual([]);
    const including = ALL_PAGES.filter(({ text }) =>
      text.includes('<include cwd>src/generated/cli-download.md</include>'),
    ).map(({ file }) => file);
    expect(including.sort()).toEqual([path.join('(overview)', 'quickstart.mdx'), path.join('(reference)', 'cli.mdx')]);
  });

  it('names the latest release', () => {
    const { version } = JSON.parse(readFileSync(path.join(ROOT, 'src/generated/marfa-release.json'), 'utf8'));
    const snippet = readFileSync(path.join(ROOT, 'src/generated/cli-download.md'), 'utf8');
    expect(snippet).toContain(`/releases/download/${version}/marfa-${version.slice(1)}-darwin-arm64.tar.gz`);
  });
});

describe('the server image commands', () => {
  it('come from the generated snippet, so a release sync updates them', () => {
    const hardCoded = ALL_PAGES.filter(({ text }) => text.includes('marfa-server:')).map(({ file }) => file);
    expect(hardCoded).toEqual([]);
    const including = ALL_PAGES.filter(({ text }) =>
      text.includes('<include cwd>src/generated/server-image.md</include>'),
    ).map(({ file }) => file);
    expect(including).toEqual([path.join('guides', 'deploy.mdx')]);
  });

  it('name the latest release and publish the port on loopback only', () => {
    const { version } = JSON.parse(readFileSync(path.join(ROOT, 'src/generated/marfa-release.json'), 'utf8'));
    const snippet = readFileSync(path.join(ROOT, 'src/generated/server-image.md'), 'utf8');
    expect(snippet).toContain(`docker pull ghcr.io/withmarfa/marfa-server:${version.slice(1)}\n`);
    expect(snippet).toContain('-p 127.0.0.1:8600:8600');
  });
});

describe('the Glossary page', () => {
  it('defines only words marfa\'s glossary uses', () => {
    const glossary = readFileSync(path.join(ROOT, 'src/generated/GLOSSARY.md'), 'utf8').toLowerCase();
    const page = ALL_PAGES.find(({ file }) => file === path.join('(overview)', 'glossary.mdx'))!;
    const words = [...page.text.matchAll(/^\| \*\*([^*]+)\*\* \|/gm)].map((match) => match[1]);
    expect(words.length).toBeGreaterThan(20);
    for (const word of words) {
      const pattern = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      expect(pattern.test(glossary), `"${word}" is not in GLOSSARY.md`).toBe(true);
    }
  });
});
