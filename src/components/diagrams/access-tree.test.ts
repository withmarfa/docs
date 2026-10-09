import { describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import spec from '../../../openapi.json';
import { nodes } from './access-tree';
import { operationHref } from './item-layers';

type Operation = { operationId?: string; tags?: string[]; summary?: string };

function operations(): Map<string, Operation> {
  const out = new Map<string, Operation>();
  const paths = (spec as unknown as { paths: Record<string, Record<string, Operation>> }).paths;
  for (const item of Object.values(paths)) {
    for (const operation of Object.values(item)) {
      if (operation?.operationId) out.set(operation.operationId, operation);
    }
  }
  return out;
}

describe('access tree', () => {
  it('names each node once', () => {
    expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length);
  });

  it('draws one root, and each other node after the node it comes from', () => {
    expect(nodes.filter((n) => n.parent === undefined)).toHaveLength(1);
    nodes.forEach((n, index) => {
      if (index === 0) expect(n.parent, n.id).toBeUndefined();
      else expect(nodes.slice(0, index).map((above) => above.id), n.id).toContain(n.parent);
    });
  });

  it('keeps the tree two levels below the root, which the stylesheet draws', () => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const n of nodes) {
      let depth = 0;
      for (let at = n.parent; at; at = byId.get(at)?.parent) depth++;
      expect(depth, n.id).toBeLessThanOrEqual(2);
    }
  });

  it('links each node to an operation the API description holds, under its tag and name', () => {
    const byId = operations();
    for (const { id, operation } of nodes) {
      const found = byId.get(operation.operationId);
      expect(found, id).toBeDefined();
      expect(found?.tags, id).toContain(operation.tag);
      expect(found?.summary, id).toBe(operation.name);
    }
  });

  it('links each operation to a page that exists', () => {
    const urls = new Set(source.getPages().map((page) => page.url));
    expect(nodes.map((n) => operationHref(n.operation)).filter((href) => !urls.has(href))).toEqual([]);
  });
});
