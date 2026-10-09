import { describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import spec from '../../../openapi.json';
import { pieces } from './device-map';
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

const linked = pieces.flatMap((p) => p.operations.map((operation) => ({ id: p.id, operation })));

describe('device map', () => {
  it('names each piece once', () => {
    expect(new Set(pieces.map((p) => p.id)).size).toBe(pieces.length);
  });

  it('links each operation to one the API description holds, under its tag and name', () => {
    const byId = operations();
    for (const { id, operation } of linked) {
      const found = byId.get(operation.operationId);
      expect(found, id).toBeDefined();
      expect(found?.tags, id).toContain(operation.tag);
      expect(found?.summary, id).toBe(operation.name);
    }
  });

  it('links each operation to a page that exists', () => {
    const urls = new Set(source.getPages().map((page) => page.url));
    expect(linked.map(({ operation }) => operationHref(operation)).filter((href) => !urls.has(href))).toEqual([]);
  });

  it('draws one instance, one directory and the device between them', () => {
    expect(pieces.filter((p) => p.row === 'instance')).toHaveLength(1);
    expect(pieces.filter((p) => p.row === 'directory')).toHaveLength(1);
    expect(pieces.filter((p) => p.row === 'device').map((p) => p.id)).toEqual(['copy', 'queue']);
  });
});
