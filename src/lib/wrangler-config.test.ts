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
  assets: { binding: string; html_handling: string; run_worker_first: string[] };
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

  // Prerender writes `<path>/index.html`. Any other setting answers a page at
  // `<path>/` and redirects every internal link, which has no slash.
  it('answers each page at its address without a trailing slash', () => {
    expect(config.assets.html_handling).toBe('drop-trailing-slash');
  });

  // `src/server.ts` reads these names from `env`. A renamed binding would
  // leave the limiter unbound, and an unbound limiter is skipped without a sound.
  it('binds the four limiters the Worker reads', () => {
    expect(config.ratelimits.map((limiter) => limiter.name).sort()).toEqual([
      'DOCS_COUNT_LIMITER',
      'DOCS_MCP_LIMITER',
      'DOCS_SEARCH_LIMITER',
      'DOCS_SITE_SEARCH_LIMITER',
    ]);
  });

  // The two that guard a cost sit below the two that must not stop a person or
  // bound the count of honest reads.
  it('sets the site search box and the count above the limits that guard the search', () => {
    const limit = (name: string) => config.ratelimits.find((entry) => entry.name === name)?.simple.limit ?? 0;
    expect(limit('DOCS_SITE_SEARCH_LIMITER')).toBeGreaterThan(limit('DOCS_SEARCH_LIMITER'));
    expect(limit('DOCS_COUNT_LIMITER')).toBeGreaterThan(limit('DOCS_MCP_LIMITER'));
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
