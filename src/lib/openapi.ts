import { createOpenAPI } from 'fumadocs-openapi/server';
import rawSpec from '../../openapi.json';

type TagLike = { name: string; description?: string };
type SpecLike = {
  tags?: TagLike[];
  paths?: Record<string, Record<string, { tags?: string[] }>>;
};

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
]);

/**
 * Declare any tag an operation references but the spec's top-level `tags` array
 * omits.
 *
 * `groupBy: 'tag'` builds one folder per *declared* tag, so an operation tagged
 * with an undeclared name produces no page at all — it disappears from the
 * sidebar, from search, and from the machine-readable surfaces, without failing
 * the build. That is silent data loss in a reference whose whole job is
 * completeness, and it is invisible in review because the spec is generated
 * upstream and synced in wholesale.
 *
 * Backfilling here keeps the reference exhaustive by construction: a new route
 * group upstream renders whether or not the generator remembered to declare it.
 * The upstream declaration is still the better place for a human-written tag
 * description, so this only supplies the name.
 */
function withUsedTagsDeclared<T>(spec: T): T {
  const doc = spec as SpecLike;
  const declared = new Set((doc.tags ?? []).map((tag) => tag.name));
  const missing: string[] = [];

  for (const operations of Object.values(doc.paths ?? {})) {
    for (const [method, operation] of Object.entries(operations)) {
      if (!HTTP_METHODS.has(method)) continue;
      for (const tag of operation.tags ?? []) {
        if (declared.has(tag)) continue;
        declared.add(tag);
        missing.push(tag);
      }
    }
  }

  if (missing.length === 0) return spec;
  return {
    ...doc,
    tags: [...(doc.tags ?? []), ...missing.map((name) => ({ name }))],
  } as T;
}

// The spec is bundled (imported, not read from disk) so the reference renders
// in dev, in the prerendered build, and on the Worker without filesystem access.
// Sync the spec from the monorepo with `scripts/sync-openapi.sh`.
const spec = withUsedTagsDeclared(rawSpec);

export const openapi = createOpenAPI({
  input: { 'marfa.json': spec as never },
});
