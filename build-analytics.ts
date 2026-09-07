/**
 * The PostHog project key a bundle was built with, injected as a `define` so
 * it never has to be read at runtime.
 *
 * MARFA_POSTHOG_KEY is set by the publish workflow from a repository variable
 * rather than a secret. A PostHog project key is write-only and ships inside
 * the browser bundle of every site that uses one, so hiding it would be
 * theater; what matters is that it is not committed.
 *
 * **An empty key is a working state, not a fault.** This repository is meant to
 * be cloned and built by people who are not us, and a hardcoded key would put
 * their traffic in our project. Absent, the analytics component returns before
 * it loads anything, so a contributor running the dev server gets a site that
 * reports nowhere and says nothing about it. That matches how the alerting
 * workflows already behave: an unset destination sends nothing.
 *
 * Shared by both build targets. A `define` does not carry from one Vite config
 * to another, and two copies of this would drift the moment one was fixed.
 */
export function posthogKey(): string {
  return process.env.MARFA_POSTHOG_KEY ?? '';
}
