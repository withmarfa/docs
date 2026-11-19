import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ICON_SETS, resolveIcon } from './icons';
import { readIconSources } from './remark-icons';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (file: string) => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));

describe('icons', () => {
  it('pins the two sets at the versions the contract names', () => {
    const manifest = read('package.json');
    for (const set of Object.values(ICON_SETS)) {
      // An exact version in the manifest, the same one installed.
      expect(manifest.devDependencies[set.package]).toBe(set.version);
      expect(read(`node_modules/${set.package}/package.json`).version).toBe(set.version);
    }
  });

  it('resolves a Lucide icon and a Simple Icons mark to their bodies', () => {
    const note = resolveIcon('lucide:sticky-note');
    expect(note.body).toContain('<path');
    expect([note.width, note.height]).toEqual([24, 24]);
    expect(resolveIcon('simple-icons:github').body).toContain('fill="currentColor"');
  });

  it('refuses what the contract refuses', () => {
    for (const id of [
      'calendar', // no set
      'lucide:', // no name
      'lucide:no-such-icon',
      'lucide:alert-circle', // an alias of circle-alert
      'lucide:album', // hidden: the set removed it
      'phosphor:house', // not a pinned set
      'Lucide:calendar',
      ' lucide:calendar',
      'lucide:calendar:extra',
      'lucide:constructor',
    ]) {
      expect(() => resolveIcon(id), id).toThrow(/is not an icon/);
    }
  });

  it('draws every icon the type catalog and the connector list name', () => {
    const { typeIcons, connectors } = readIconSources(ROOT);
    expect(typeIcons.size).toBeGreaterThan(20);
    for (const id of typeIcons.values()) expect(() => resolveIcon(id), id).not.toThrow();
    for (const connector of connectors) {
      if (connector.sourceMark) expect(() => resolveIcon(connector.sourceMark!), connector.name).not.toThrow();
    }
  });
});
