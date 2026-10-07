import { describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import spec from '../../../openapi.json';
import { operationHref, parts } from './item-layers';

// The edge types Marfa ships: withmarfa/marfa's edges chapter, `edges/types-shipped`.
const SHIPPED_EDGE_TYPES = [
  'about',
  'parent-of',
  'in-thread',
  'attached-to',
  'authored-by',
  'derived-from',
  'supersedes',
  'references',
  'in-collection',
  'in-folder',
];

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

describe('item layers', () => {
  it('names each part once', () => {
    expect(new Set(parts.map((part) => part.id)).size).toBe(parts.length);
  });

  it('writes each part with an operation the API description holds, under its tag and name', () => {
    const byId = operations();
    for (const { id, writtenWith } of parts) {
      const operation = byId.get(writtenWith.operationId);
      expect(operation, id).toBeDefined();
      expect(operation?.tags, id).toContain(writtenWith.tag);
      expect(operation?.summary, id).toBe(writtenWith.name);
    }
  });

  it('links each operation to a page that exists', () => {
    const urls = new Set(source.getPages().map((page) => page.url));
    expect(parts.map((part) => operationHref(part.writtenWith)).filter((href) => !urls.has(href))).toEqual([]);
  });

  it('draws an edge for each part in the edges layer, of a shipped edge type, and for no other part', () => {
    for (const part of parts) {
      if (part.layer === 'edges') expect(SHIPPED_EDGE_TYPES, part.id).toContain(part.edge?.type);
      else expect(part.edge, part.id).toBeUndefined();
    }
  });

  // The item's version counts writes to its own fields (withmarfa/marfa's
  // versions chapter). A tag or extension write moves only `updated_at`
  // (`items/tag-updated-at`), and an edge has a version of its own.
  it('moves the item version only by a write to its properties', () => {
    for (const part of parts) {
      const expected = part.layer === 'properties' ? 'item' : part.layer === 'edges' ? 'edge' : 'none';
      expect(part.version, part.id).toBe(expected);
    }
  });
});
