/**
 * Holds the connector Catalog to the list in the plugins repository. A page is keyed by a
 * connector's name, not its source, because two connectors can share a source.
 * The sync writes the list, where it came from, the index and each header, and
 * a page for any connector that has none; a page for a name the list lacks
 * fails here and in the build (`remarkIcons`).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { connectorTitle, readConnectors } from './connectors';
import { source } from './source';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PAGES = path.join(ROOT, 'content/docs/catalog/connectors');
const GENERATED = path.join(ROOT, 'src/generated/connectors');

const connectors = readConnectors(ROOT);
const read = (file: string) => readFileSync(file, 'utf8');

/** The top-level types of the shipped catalog, which have a Catalog page at `/catalog/<name after the family>`. */
const catalogPages = new Map(
  (JSON.parse(read(path.join(ROOT, 'src/generated/catalog/builtin-catalog.json'))) as { types: { id: string }[] }).types
    .filter((type) => type.id.split('.').length === 2)
    .map((type) => [type.id, `/catalog/${type.id.split('.')[1]}`] as const),
);

describe('connectors', () => {
  it('has a page for each connector in the list, and no page for another', () => {
    const pages = readdirSync(PAGES)
      .filter((file) => file.endsWith('.mdx') && file !== 'index.mdx')
      .map((file) => file.slice(0, -4));
    expect([...pages].sort()).toEqual(connectors.map((c) => c.name).sort());
  });

  it('keys two connectors that share a source by their names', () => {
    const shared = connectors.filter((c) => c.source === 'readwise').map((c) => c.name);
    expect(shared.sort()).toEqual(['readwise', 'readwise-reader']);
  });

  it('titles each page as the index names it', () => {
    for (const connector of connectors) {
      const page = read(path.join(PAGES, `${connector.name}.mdx`));
      expect(page, connector.name).toContain(`\ntitle: ${connectorTitle(connector)}\n`);
    }
    expect(connectorTitle({ name: 'readwise-reader', source: 'readwise', sourceName: 'Readwise' })).toBe('Readwise Reader');
    expect(connectorTitle({ name: 'github', source: 'github', sourceName: 'GitHub' })).toBe('GitHub');
    expect(connectorTitle({ name: 'other', source: 'service', sourceName: 'Service' })).toBe('Other');
  });

  it('includes the generated header once, and nothing a page repeats by hand', () => {
    for (const connector of connectors) {
      const page = read(path.join(PAGES, `${connector.name}.mdx`));
      const include = `<include cwd>src/generated/connectors/${connector.name}.md</include>`;
      expect(page.split(include).length - 1, connector.name).toBe(1);
      expect(existsSync(path.join(GENERATED, `${connector.name}.md`)), connector.name).toBe(true);
      expect(page, connector.name).not.toMatch(/\| Source code \|/);
    }
  });

  it('lists the connectors in the index in the order the sidebar shows them, with each mark', () => {
    const folder = source
      .getPageTree()
      .children.flatMap(function find(node): typeof node[] {
        return node.type === 'folder' ? [node, ...node.children.flatMap(find)] : [];
      })
      .find((node) => node.type === 'folder' && node.index?.url === '/catalog/connectors');
    const sidebar = (folder?.type === 'folder' ? folder.children : []).flatMap((node) => (node.type === 'page' ? [node.url] : []));
    expect(sidebar).toEqual(connectors.map((c) => `/catalog/connectors/${c.name}`));

    const rows = read(path.join(GENERATED, 'index.md'))
      .trim()
      .split('\n')
      .slice(2)
      .map((line) => line.split('|').map((cell) => cell.trim()));
    expect(rows.map((cells) => cells[2])).toEqual(
      connectors.map((c) => `[${connectorTitle(c)}](/catalog/connectors/${c.name})`),
    );
    expect(rows.map((cells) => cells[1])).toEqual(connectors.map((c) => (c.sourceMark ? `\`${c.sourceMark}\`` : '')));
  });

  it('says in each header what the list says', () => {
    for (const c of connectors) {
      const header = read(path.join(GENERATED, `${c.name}.md`));
      expect(header, c.name).toContain(`**Source:** \`${c.source}\``);
      for (const type of c.types) expect(header, `${c.name} ${type}`).toContain(`\`${type}\``);
      expect(header.includes('**Can be turned off:**'), c.name).toBe(c.carriesBack);
    }
  });

  it('links a type that has a Catalog page, in the index and in every header, and only that type', () => {
    for (const c of connectors) {
      const header = read(path.join(GENERATED, `${c.name}.md`));
      const types = header.match(/^- \*\*Types:\*\* (.*)$/m)?.[1] ?? '';
      expect(types.split(', '), c.name).toEqual(
        c.types.map((type) => {
          const page = catalogPages.get(type);
          return page ? `[\`${type}\`](${page})` : `\`${type}\``;
        }),
      );
      for (const type of c.carriedTypes) {
        const page = catalogPages.get(type);
        expect(header, `${c.name} carries ${type}`).toContain(page ? `[\`${type}\`](${page})` : `\`${type}\``);
      }
    }
  });

  it('links each type only to a page the Catalog has', () => {
    for (const page of new Set(catalogPages.values())) {
      expect(source.getPage(page.replace(/^\//, '').split('/')), page).toBeDefined();
    }
    // A catalog with no page for a connector's own type must leave it as code.
    expect(catalogPages.has('readwise.source')).toBe(false);
  });

  it('records the plugins commit the list came from, and the tag that names it if one does', () => {
    const origin = JSON.parse(read(path.join(GENERATED, 'source.json'))) as { repository: string; commit: string; tag: string | null };
    expect(origin.repository).toBe('withmarfa/plugins');
    expect(origin.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(origin.tag === null || /^v\d+\.\d+\.\d+$/.test(origin.tag)).toBe(true);
  });

  it('leaves the order of the sidebar to the file names: the folder lists no pages', () => {
    const meta = JSON.parse(read(path.join(PAGES, 'meta.json'))) as { pages?: string[] };
    expect(meta.pages).toBeUndefined();
  });
});
