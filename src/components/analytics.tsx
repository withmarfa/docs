import { useEffect } from 'react';
import { posthogOptions, setClient, siteProperties, type Site } from '../lib/analytics';

/**
 * Loads PostHog, after the page is already up.
 *
 * **The deferral is the design, not an optimization.** A static import would
 * put the SDK in the entry chunk, on the critical path, where a slow fetch or
 * a parse error becomes the page's problem. The status page carries this too,
 * and its whole job is to render when other things are failing — so the SDK is
 * fetched in its own chunk once the document has rendered and hydrated. If
 * PostHog is unreachable the import rejects, it is caught, and nothing about
 * the page changes.
 *
 * Relative imports rather than the `@/` alias: the status build resolves no
 * path aliases on purpose, so an aliased import here would break one of the
 * two sites at build time.
 *
 * Renders nothing, ever, on either side of hydration.
 */

/**
 * Module scope rather than component state, because React runs effects twice
 * in development and `init` is not idempotent.
 */
let started = false;

export function Analytics({ site }: { site: Site }) {
  useEffect(() => {
    // No key, no analytics, no complaint. A build without one is what a fork
    // gets, and reporting nowhere is the correct behavior there.
    if (!__POSTHOG_KEY__ || started) return;
    started = true;

    import('posthog-js')
      .then(({ default: posthog }) => {
        posthog.init(__POSTHOG_KEY__, posthogOptions());
        posthog.register(siteProperties(site));
        setClient(posthog);
      })
      .catch(() => {
        // Deliberately silent. Analytics failing to load is not something to
        // tell a reader about, and it must not become an error of its own.
        started = false;
      });
  }, [site]);

  return null;
}
