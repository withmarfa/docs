import { describe, expect, it } from 'vitest';
import { trees } from './type-tree';

// The type identifier grammar of withmarfa/marfa's types chapter, `types/id-grammar`.
const TYPE_ID = /^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/;

describe('type tree', () => {
  const nodes = trees.flat();

  it('names every type in the identifier grammar, in the namespace it shows', () => {
    for (const node of nodes) {
      expect(node.id.length, node.id).toBeLessThanOrEqual(128);
      expect(node.id, node.id).toMatch(TYPE_ID);
      expect(node.id.split('.')[0], node.id).toBe(node.namespace);
      if (node.namespace === 'app') expect(node.id.split('.'), node.id).toHaveLength(3);
    }
  });

  it('marks every type outside core as an example, and no core type', () => {
    for (const node of nodes) expect(Boolean(node.example), node.id).toBe(node.namespace !== 'core');
  });

  it('draws each type after the type it hangs from, in the same tree', () => {
    for (const tree of trees) {
      tree.forEach((node, index) => {
        if (index === 0) expect(node.from, node.id).toBeUndefined();
        else expect(tree.slice(0, index).map((above) => above.id), node.id).toContain(node.from?.id);
      });
    }
  });

  it('names each type once', () => {
    expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
  });
});
