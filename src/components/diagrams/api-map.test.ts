import { describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import spec from '../../../openapi.json';
import { clusters, groupHref, landingOverrides } from './api-map';

type Operation = { operationId?: string; tags?: string[] };
type PathItem = Record<string, Operation>;

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

/** The path items, then the webhooks, in document order. */
function operationItems(): PathItem[] {
  const doc = spec as unknown as { paths: Record<string, PathItem>; webhooks?: Record<string, PathItem> };
  return [...Object.values(doc.paths), ...Object.values(doc.webhooks ?? {})];
}

/** Each tag's first operation, reading the paths and then the webhooks in document order. */
function firstOperations(): Map<string, string> {
  const first = new Map<string, string>();
  for (const item of operationItems()) {
    for (const [method, operation] of Object.entries(item)) {
      if (!HTTP_METHODS.has(method) || !operation.operationId) continue;
      for (const tag of operation.tags ?? []) {
        if (!first.has(tag)) first.set(tag, operation.operationId);
      }
    }
  }
  return first;
}

/** The tags of every operation, by `operationId`. */
function operationTags(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const item of operationItems()) {
    for (const [method, operation] of Object.entries(item)) {
      if (HTTP_METHODS.has(method) && operation.operationId) out.set(operation.operationId, operation.tags ?? []);
    }
  }
  return out;
}

const groups = clusters.flatMap((cluster) => cluster.groups);

describe('API map', () => {
  it('shows every tag once, in the order the API description lists them', () => {
    expect(groups.map((group) => group.tag)).toEqual(spec.tags.map((tag) => tag.name));
  });

  it('opens each group at one of its own operations', () => {
    const tagsOf = operationTags();
    expect(
      groups.filter((group) => !(tagsOf.get(group.start) ?? []).includes(group.tag)).map((group) => group.tag),
    ).toEqual([]);
  });

  it('opens each group at its first operation unless the override list names another', () => {
    const first = firstOperations();
    expect(Object.fromEntries(groups.map((group) => [group.tag, group.start]))).toEqual(
      Object.fromEntries(
        groups.map((group) => [group.tag, landingOverrides.get(group.tag) ?? first.get(group.tag)]),
      ),
    );
  });

  it('lists only overrides that change a landing', () => {
    const first = firstOperations();
    const tags = new Set(groups.map((group) => group.tag));
    for (const [tag, operationId] of landingOverrides) {
      expect(tags.has(tag), `${tag} is not a group`).toBe(true);
      expect(operationId, `${tag} already opens at ${operationId}`).not.toBe(first.get(tag));
    }
  });

  it('links each group to a page that exists', () => {
    const urls = new Set(source.getPages().map((page) => page.url));
    expect(groups.map(groupHref).filter((href) => !urls.has(href))).toEqual([]);
  });
});
