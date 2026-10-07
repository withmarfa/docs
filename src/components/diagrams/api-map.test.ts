import { describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import spec from '../../../openapi.json';
import { clusters, groupHref } from './api-map';

type Operation = { operationId?: string; tags?: string[] };
type PathItem = Record<string, Operation>;

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

/** Each tag's first operation, reading the paths and then the webhooks in document order. */
function firstOperations(): Map<string, string> {
  const doc = spec as unknown as { paths: Record<string, PathItem>; webhooks?: Record<string, PathItem> };
  const first = new Map<string, string>();
  for (const item of [...Object.values(doc.paths), ...Object.values(doc.webhooks ?? {})]) {
    for (const [method, operation] of Object.entries(item)) {
      if (!HTTP_METHODS.has(method) || !operation.operationId) continue;
      for (const tag of operation.tags ?? []) {
        if (!first.has(tag)) first.set(tag, operation.operationId);
      }
    }
  }
  return first;
}

const groups = clusters.flatMap((cluster) => cluster.groups);

describe('API map', () => {
  it('shows every tag once, in the order the API description lists them', () => {
    expect(groups.map((group) => group.tag)).toEqual(spec.tags.map((tag) => tag.name));
  });

  it("opens each group at its first operation in the API description", () => {
    const first = firstOperations();
    expect(Object.fromEntries(groups.map((group) => [group.tag, group.start]))).toEqual(
      Object.fromEntries(groups.map((group) => [group.tag, first.get(group.tag)])),
    );
  });

  it('links each group to a page that exists', () => {
    const urls = new Set(source.getPages().map((page) => page.url));
    expect(groups.map(groupHref).filter((href) => !urls.has(href))).toEqual([]);
  });
});
