import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RATE_LIMIT_PERIOD_SECONDS } from './rate-limit';

// The tests in worker.test.ts stand in for the platform, so only this file
// notices when the config stops sending page requests to the Worker first.
const config = JSON.parse(
  readFileSync(new URL('../../wrangler.jsonc', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n'),
) as {
  main: string;
  assets: { binding: string; run_worker_first: string[] };
  ratelimits: { name: string; namespace_id: string; simple: { limit: number; period: number } }[];
};

describe('wrangler.jsonc', () => {
  it('deploys the custom Worker entry', () => {
    expect(config.main).toBe('src/server.ts');
  });

  it('runs the Worker ahead of the static files for page addresses', () => {
    expect(config.assets.binding).toBe('ASSETS');
    expect(config.assets.run_worker_first[0]).toBe('/*');
  });

  // `src/server.ts` reads these two names from `env`. A renamed binding would
  // leave the limiter unbound, and an unbound limiter is skipped without a sound.
  it('binds the two limiters the Worker reads', () => {
    expect(config.ratelimits.map((limiter) => limiter.name).sort()).toEqual(['DOCS_MCP_LIMITER', 'DOCS_SEARCH_LIMITER']);
  });

  it('gives each limiter its own namespace, so their counts stay apart', () => {
    const ids = config.ratelimits.map((limiter) => limiter.namespace_id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[1-9]\d*$/);
  });

  it('counts in the window that Retry-After reports, which Cloudflare allows as 10 or 60 seconds', () => {
    for (const limiter of config.ratelimits) {
      expect(limiter.simple.period).toBe(RATE_LIMIT_PERIOD_SECONDS);
      expect([10, 60]).toContain(limiter.simple.period);
    }
  });
});
