import { describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import spec from '../../../openapi.json';
import { pieces } from './connector-map';
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

const named = pieces.flatMap((p) => (p.operation ? [{ id: p.id, operation: p.operation }] : []));

describe('connector map', () => {
  it('names each piece once', () => {
    expect(new Set(pieces.map((p) => p.id)).size).toBe(pieces.length);
  });

  it('links each piece to an operation the API description holds, under its tag and name', () => {
    const byId = operations();
    for (const { id, operation } of named) {
      const found = byId.get(operation.operationId);
      expect(found, id).toBeDefined();
      expect(found?.tags, id).toContain(operation.tag);
      expect(found?.summary, id).toBe(operation.name);
    }
  });

  it('links each operation to a page that exists', () => {
    const urls = new Set(source.getPages().map((page) => page.url));
    expect(named.map((n) => operationHref(n.operation)).filter((href) => !urls.has(href))).toEqual([]);
  });

  it('makes every piece the instance keeps with an operation, and the two outside with none', () => {
    for (const p of pieces) {
      expect(p.operation === undefined, p.id).toBe(p.place === 'outside');
    }
  });

  it('draws the vendor and the connector outside, and the rest in three groups', () => {
    const places = (place: string) => pieces.filter((p) => p.place === place).map((p) => p.id);
    expect(places('outside')).toEqual(['vendor', 'connector']);
    expect(places('key')).toEqual(['registration', 'hold']);
    expect(places('source')).toEqual(['state', 'agreements']);
    expect(places('data')).toEqual(['items', 'endpoint', 'deliveries']);
  });
});
