import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { edges, messages, trashed } from './bin-cascade';

describe('bin cascade figure', () => {
  // withmarfa/marfa: `edges/cascade-parent-of` and `items/trash-cascade` (a
  // cascade follows outbound edges to their targets), `edges/orphan-shipped`
  // (an orphan leaves the other end active, whichever end is trashed).
  it('takes the child with its parent and leaves the book', () => {
    expect(trashed('note')).toEqual(['note', 'child']);
  });

  it('takes nothing with a child, because a cascade never runs back to the parent', () => {
    expect(trashed('child')).toEqual(['child']);
  });

  it('leaves the note when its book is trashed', () => {
    expect(trashed('book')).toEqual(['book']);
  });

  it('has a message for each choice', () => {
    expect(Object.keys(messages).sort()).toEqual(['book', 'child', 'note']);
  });

  // `edges/types-shipped-cascade`: parent-of cascades and the other eight shipped types orphan.
  it('draws the on-delete behavior the synced edge type table gives each edge type', () => {
    const table = readFileSync(new URL('../../generated/catalog/edge-types.md', import.meta.url), 'utf8');
    for (const edge of edges) {
      const row = table.split('\n').find((line) => line.startsWith(`| \`${edge.type}\``));
      expect(row, edge.type).toBeDefined();
      expect(row!.split('|').map((cell) => cell.trim())).toContain(`\`${edge.onDelete}\``);
    }
  });
});
