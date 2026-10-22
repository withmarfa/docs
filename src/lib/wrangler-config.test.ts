import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The tests in worker.test.ts stand in for the platform, so only this file
// notices when the config stops sending page requests to the Worker first.
const config = JSON.parse(
  readFileSync(new URL('../../wrangler.jsonc', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n'),
) as { main: string; assets: { binding: string; run_worker_first: string[] } };

describe('wrangler.jsonc', () => {
  it('deploys the custom Worker entry', () => {
    expect(config.main).toBe('src/server.ts');
  });

  it('runs the Worker ahead of the static files for page addresses', () => {
    expect(config.assets.binding).toBe('ASSETS');
    expect(config.assets.run_worker_first[0]).toBe('/*');
  });
});
