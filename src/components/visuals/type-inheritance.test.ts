import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { listings } from './type-inheritance';

describe('type inheritance figure', () => {
  // withmarfa/marfa `types/listing-subtree`: a listing returns its type and every type whose
  // chain of `parent` reaches it, and nothing else, so a compatible type is left out.
  it('draws each type under its parent, and the compatible type left out at the top level', () => {
    const [files, notes] = listings;
    expect(files.nodes.map((node) => [node.id, node.depth, node.left ?? false])).toEqual([
      ['core.file', 0, false],
      ['core.file.image', 1, false],
      ['app.example.receipt', 2, false],
    ]);
    expect(notes.nodes.filter((node) => node.left).map((node) => node.id)).toEqual(['user.recipe']);
  });

  it('draws a shipped child type under the parent the catalog gives it', () => {
    const table = readFileSync(new URL('../../generated/catalog/types.md', import.meta.url), 'utf8');
    const row = table.split('\n').find((line) => line.startsWith('| [`core.file`]'));
    expect(row, 'core.file row').toBeDefined();
    expect(row).toContain('#core-file-image');
  });
});
