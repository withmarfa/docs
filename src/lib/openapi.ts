import { createOpenAPI } from 'fumadocs-openapi/server';
import spec from '../../openapi.json';

// The spec is bundled (imported, not read from disk) so the reference renders
// in dev, in the prerendered build, and on the Worker without filesystem access.
// Sync the spec from the monorepo with `scripts/sync-openapi.sh`.
export const openapi = createOpenAPI({
  input: () => ({ 'marfa.json': spec as never }),
});
