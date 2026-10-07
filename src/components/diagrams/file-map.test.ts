import { describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import spec from '../../../openapi.json';
import { pieces } from './file-map';
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

describe('file map', () => {
  it('names each piece once', () => {
    expect(new Set(pieces.map((p) => p.id)).size).toBe(pieces.length);
  });

  it('links each piece to an operation the API description holds, under its tag and name', () => {
    const byId = operations();
    for (const { id, operation } of pieces) {
      const found = byId.get(operation.operationId);
      expect(found, id).toBeDefined();
      expect(found?.tags, id).toContain(operation.tag);
      expect(found?.summary, id).toBe(operation.name);
    }
  });

  it('links each operation to a page that exists', () => {
    const urls = new Set(source.getPages().map((page) => page.url));
    expect(pieces.map((p) => operationHref(p.operation)).filter((href) => !urls.has(href))).toEqual([]);
  });

  it('draws one blob and the two kinds of store a listing answers', () => {
    expect(pieces.filter((p) => p.tier === 'blob')).toHaveLength(1);
    expect(pieces.filter((p) => p.tier === 'store')).toHaveLength(2);
  });

  // withmarfa/marfa's stores chapter keeps a blob that any of these names
  // (`stores/orphan-keeps-items`, `-edges`, `-extensions`, `-versions`), and
  // its blobs chapter withholds the read through an earlier version alone
  // (`blobs/lend-earlier-version`).
  // The caption's last sentence is built from `reference`, so this holds
  // what each referrer's caption says.
  it('gives every referrer a reference, lending through all but an earlier version', () => {
    for (const p of pieces) {
      if (p.tier !== 'referrer') {
        expect(p.reference, p.id).toBeUndefined();
        continue;
      }
      expect(p.reference, p.id).toBeDefined();
      expect(p.reference?.lendsTo === null, p.id).toBe(p.id === 'version');
    }
  });
});
