import { describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import spec from '../../../openapi.json';
import { pieces } from './change-flow';
import { operationHref } from './item-layers';

type Parameter = { name: string; in: string };
type Operation = { operationId?: string; tags?: string[]; summary?: string; parameters?: Parameter[] };

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

describe('change flow', () => {
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

  it('draws one write, one log and the three ways of being told', () => {
    expect(pieces.filter((p) => p.row === 'write')).toHaveLength(1);
    expect(pieces.filter((p) => p.row === 'log')).toHaveLength(1);
    expect(pieces.filter((p) => p.row === 'outlet').map((p) => p.id)).toEqual(['stream', 'copy', 'webhook']);
  });

  // The stream and the copy stream are one operation, told apart by `copy`,
  // and a stream resumes from `Last-Event-ID` (`events/resume-replays-after`,
  // `read-views/copy-bootstrap`).
  it('holds the stream to the parameters its captions name', () => {
    const stream = operations().get('streamEvents');
    const named = (stream?.parameters ?? []).map((parameter) => `${parameter.in}:${parameter.name}`);
    expect(named).toContain('query:copy');
    expect(named).toContain('header:Last-Event-ID');
    expect(named).toContain('header:X-Marfa-Read-View');
  });
});
