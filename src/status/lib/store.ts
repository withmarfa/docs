import { env } from 'cloudflare:workers';

/**
 * The only module that touches the binding.
 *
 * Everything else takes strings, so the decoder and the page can be tested
 * without a Workers runtime — the test config loads no Cloudflare plugin, and
 * anything importing this module would fail at collection rather than at
 * assertion.
 */

export type RawStore = {
  state: string | null;
  meta: string | null;
};

/**
 * A short cache, because this is a public page bots will hit and every
 * uncached view is a sixteen-kilobyte read of the whole blob. Well under the
 * checker's write cooldown, so it cannot make the page meaningfully staler
 * than the store already is.
 */
const CACHE_TTL_MS = 30_000;

let cached: { at: number; value: RawStore } | null = null;

async function readKey(key: string): Promise<string | null> {
  const row = await env.UPTIMEFLARE_D1.prepare(
    'SELECT value FROM uptimeflare WHERE key = ?',
  )
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function readStore(now = Date.now()): Promise<RawStore> {
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  // Both keys or neither. A page rendered from a fresh state and a stale set
  // of labels would show the right numbers against the wrong names, which is
  // worse than showing nothing.
  const [state, meta] = await Promise.all([readKey('state'), readKey('meta')]);
  const value: RawStore = { state, meta };
  cached = { at: now, value };
  return value;
}
