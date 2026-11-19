/**
 * Holds the connector Catalog to marfa-connectors' list. A page is keyed by a
 * connector's name, not its source, because two connectors can share a source.
 * The sync writes the list, the index and each header, and a page for any
 * connector that has none; a page for a name the list lacks fails here and in
 * the build (`remarkIcons`).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { connectorTitle, readConnectors } from './connectors';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PAGES = path.join(ROOT, 'content/docs/catalog/connectors');
const GENERATED = path.join(ROOT, 'src/generated/connectors');

const connectors = readConnectors(ROOT);
const read = (file: string) => readFileSync(file, 'utf8');

describe('connectors', () => {
  it('has a page for each connector in the list, and no page for another', () => {
    const pages = readdirSync(PAGES)
      .filter((file) => file.endsWith('.mdx') && file !== 'index.mdx')
      .map((file) => file.slice(0, -4))
      .sort();
    expect(pages).toEqual(connectors.map((c) => c.name));
  });

  it('keys two connectors that share a source by their names', () => {
    const shared = connectors.filter((c) => c.source === 'readwise').map((c) => c.name);
    expect(shared).toEqual(['readwise', 'readwise-reader']);
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

  it('lists the connectors in the index by name, with each mark', () => {
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
});
