import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { listings, TypeInheritance, type TreeNode } from './type-inheritance';

describe('type inheritance figure', () => {
  // withmarfa/marfa `types/listing-subtree`: a listing returns its type and every type whose
  // chain of `parent` reaches it, and nothing else, so a compatible type is left out.
  it('draws each type under its parent, and the compatible type left out at the top level', () => {
    const [files, notes] = listings;
    const flat = (nodes: readonly TreeNode[], depth = 0): [string, number, boolean][] =>
      nodes.flatMap((node) => [[node.id, depth, node.left ?? false] as [string, number, boolean], ...flat(node.children ?? [], depth + 1)]);
    expect(flat(files.nodes)).toEqual([
      ['core.file', 0, false],
      ['core.file.image', 1, false],
      ['app.example.receipt', 2, false],
    ]);
    expect(flat(notes.nodes)).toEqual([
      ['core.note', 0, false],
      ['user.recipe', 0, true],
    ]);
  });

  it('nests each type in the list of its parent, and marks only the types a listing returns', () => {
    const html = renderToStaticMarkup(createElement(TypeInheritance));
    expect(html).toMatch(/<li><span class="marfa-ti-node" data-returned="true"><code>core.file<\/code><\/span><ul role="list"><li><span[^>]*><code>core.file.image<\/code><\/span><ul role="list"><li>/);
    expect(html.match(/data-returned/g)).toHaveLength(4);
    expect(html).toMatch(/data-left="true"><code>user.recipe<\/code>/);
  });

  it('draws a shipped child type under the parent the catalog gives it', () => {
    const page = readFileSync(new URL('../../generated/catalog/core.file.md', import.meta.url), 'utf8');
    expect(page).toMatch(/^### core\.file\.image \[#core-file-image\]$/m);
  });
});
