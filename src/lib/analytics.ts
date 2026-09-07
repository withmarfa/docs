import type { PostHog, PostHogConfig } from 'posthog-js';

/**
 * What both sites send to PostHog, and what they deliberately do not.
 *
 * **Nothing here may import `posthog-js` as a value.** The type import above
 * erases at build time; a value import would pull the SDK into whatever chunk
 * reaches this module, and the error components import it. That would put
 * roughly 79 kB of third party on the critical path of a status page whose
 * whole job is to render when other things are failing. The SDK is loaded by a
 * dynamic import after hydration instead, in `src/components/analytics.tsx`.
 */

/** Which of the two sites an event came from. */
export type Site = 'docs' | 'status';

/**
 * EU Cloud. `api_host` takes ingestion, `ui_host` is where links back into
 * PostHog resolve. A US host with an EU key does not silently misroute, it
 * fails to authenticate — the good failure, but a total one.
 */
const API_HOST = 'https://eu.i.posthog.com';
const UI_HOST = 'https://eu.posthog.com';

/**
 * Pins the SDK's dated behavior bundle so upgrading the package cannot quietly
 * change what is captured. The newest this version offers.
 */
const DEFAULTS = '2026-08-30' as const;

/**
 * Every option is a decision rather than an omission, so that the set reads as
 * intent to whoever finds it next.
 *
 * Two constraints sit behind almost all of it. PostHog's free allowances are
 * per organization, so these two sites draw on the same pool the hosted
 * platform depends on. And the only questions being asked are which pages are
 * read, and what is failing.
 */
export function posthogOptions(): Partial<PostHogConfig> {
  return {
    api_host: API_HOST,
    ui_host: UI_HOST,
    defaults: DEFAULTS,

    // Off. It emits an event for every click, input and form submission, so on
    // a documentation site every navigation is itself a capture — several
    // times the volume, against a shared allowance, to answer nothing anyone
    // asked.
    autocapture: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_performance: false,

    // Off. The heaviest product by bandwidth and a shared recording allowance,
    // for a question neither site has.
    disable_session_recording: true,
    disable_surveys: true,
    disable_web_experiments: true,
    advanced_disable_feature_flags: true,

    // Both sites navigate client-side after the first load, so history-based
    // capture is what makes an in-page navigation count as a read.
    capture_pageview: 'history_change',
    capture_pageleave: true,

    // On, and explicitly. Left unset this does not mean off — it defers to a
    // setting in the PostHog project, which puts the decision somewhere a
    // reader of this repository cannot see. It hooks unhandled errors and
    // unhandled promise rejections, and lazily fetches about 4.5 kB to do it.
    // Console errors stay off: a page's console is not a defect report.
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },

    // `never`, not the `identified_only` default, and the difference is not
    // theoretical: under cookieless mode the SDK sends an initial `$set`,
    // which promotes the derived id to a person profile. Measured — three
    // appeared in the project before this was changed. `never` sends
    // `$process_person_profile: False` on everything instead, so nothing here
    // creates a profile and every event stays on the cheaper anonymous tier.
    // Nobody signs in to either site, so there is nothing to give up.
    person_profiles: 'never',

    // No cookie, no local storage, no consent banner on a public documentation
    // site. PostHog derives a privacy-preserving hash server-side instead. The
    // cost is cross-session identity, which nothing here needs. This has to be
    // enabled on the project too, or events arrive and are dropped.
    cookieless_mode: 'always',
    persistence: 'memory',
  };
}

/**
 * Registered on every event the site sends.
 *
 * `$host` already separates the two for free, but that is an accident of the
 * URL. This survives a hostname change and says which site it means on
 * purpose.
 */
export function siteProperties(site: Site): Record<string, string> {
  return { site };
}

/**
 * The loaded client, or null.
 *
 * Null on the server, null before the dynamic import resolves, and null
 * forever when the build had no key. Everything reporting through this has to
 * be happy with all three.
 */
let client: PostHog | null = null;

/**
 * Errors that happened before the SDK finished loading.
 *
 * **This is the case that matters, not an edge one.** The SDK is fetched after
 * hydration, and an error bad enough to break the first render happens before
 * that — so without somewhere to hold them, the reports lost would be exactly
 * the reports worth having. A store outage rendering the error page is the
 * worked example: it beat the loader by whole seconds.
 *
 * Bounded, because the failure mode this guards against is a loop. Ten is well
 * past the point where the eleventh tells you anything new.
 */
const pending: unknown[] = [];
const PENDING_LIMIT = 10;

/** Called once, by the loader, after the SDK has initialized. */
export function setClient(loaded: PostHog): void {
  client = loaded;
  for (const error of pending.splice(0)) send(loaded, error);
}

function send(to: PostHog, error: unknown): void {
  try {
    to.captureException(error);
  } catch {
    // Reporting a failure must not become one.
  }
}

/**
 * Report an error a route already caught.
 *
 * The unhandled-error hooks above never see these: the router catches them and
 * renders an error component, which is the whole reason those components
 * exist. So each one calls this beside the `console.error` it already makes.
 *
 * Queued rather than dropped when the SDK has not loaded yet, and discarded
 * entirely on the server.
 */
export function reportError(error: unknown): void {
  if (client) {
    send(client, error);
    return;
  }

  // Nothing to do on the server, and the check has to be explicit: these
  // components render on both sides, and a module-level queue in a Worker
  // outlives the request that filled it.
  if (typeof window === 'undefined') return;

  // With no key nothing ever drains this, which is why the bound is not
  // optional.
  if (pending.length < PENDING_LIMIT) pending.push(error);
}
