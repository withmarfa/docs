import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { posthogOptions, siteProperties } from './analytics';
import type { PostHog } from 'posthog-js';

/**
 * These assertions exist to hold decisions, not to prove the object literal
 * was typed correctly.
 *
 * Every product turned off below is off because PostHog's free allowances are
 * per organization, so both public sites draw on the same pool the hosted
 * platform depends on. Turning one back on is a real decision with a cost, and
 * this is what makes it a deliberate one rather than a default that drifted.
 */
describe('what the sites capture', () => {
  const options = posthogOptions();

  it('sends to the EU, where the project lives', () => {
    // A US host with an EU key fails to authenticate outright, so this is not
    // a preference — the wrong value captures nothing at all.
    expect(options.api_host).toBe('https://eu.i.posthog.com');
    expect(options.ui_host).toBe('https://eu.posthog.com');
  });

  it('pins the dated defaults so an SDK upgrade cannot change capture', () => {
    expect(options.defaults).toBe('2026-08-30');
  });

  it('captures page views across client-side navigation', () => {
    // Both sites route in the browser after the first load, so plain `true`
    // would count only the landing.
    expect(options.capture_pageview).toBe('history_change');
    expect(options.capture_pageleave).toBe(true);
  });

  it('captures unhandled errors but not the console', () => {
    // Unset would not mean off. It would defer to a project setting, putting
    // the decision somewhere no reader of this repository can see it.
    expect(options.capture_exceptions).toEqual({
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    });
  });

  it('leaves autocapture and every heavy product off', () => {
    expect(options.autocapture).toBe(false);
    expect(options.capture_heatmaps).toBe(false);
    expect(options.capture_dead_clicks).toBe(false);
    expect(options.capture_performance).toBe(false);
    expect(options.disable_session_recording).toBe(true);
    expect(options.disable_surveys).toBe(true);
    expect(options.disable_web_experiments).toBe(true);
    expect(options.advanced_disable_feature_flags).toBe(true);
  });

  it('stores nothing in the browser, so neither site needs a consent banner', () => {
    expect(options.cookieless_mode).toBe('always');
    expect(options.persistence).toBe('memory');
    // `never` rather than the `identified_only` default: under cookieless
    // mode that default still creates person profiles, via an initial `$set`.
    expect(options.person_profiles).toBe('never');
  });
});

describe('telling the two sites apart', () => {
  it('registers which site an event came from', () => {
    expect(siteProperties('docs')).toEqual({ site: 'docs' });
    expect(siteProperties('status')).toEqual({ site: 'status' });
  });
});

/**
 * The SDK is fetched after hydration, so an error bad enough to break the
 * first render happens before there is anything to report it with. These hold
 * the queue that closes that window — the case found by actually breaking the
 * status page, where the store failed and the error page rendered seconds
 * before the loader resolved.
 *
 * The queue and the client are module state, so each case takes a fresh copy
 * of the module rather than inheriting whatever the last one left behind.
 */
describe('errors raised before the SDK has loaded', () => {
  function stub() {
    const captured: unknown[] = [];
    const client = { captureException: (e: unknown) => captured.push(e) } as unknown as PostHog;
    return { client, captured };
  }

  // The queue is deliberately skipped on the server, and these tests run in
  // Vitest's node environment, where there is no `window`. Standing one up is
  // cheaper and more honest than pulling a DOM runtime in for four cases —
  // this is the exact global the code branches on.
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('window', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function freshModule() {
    return import('./analytics');
  }

  it('sends what it was holding once the client arrives', async () => {
    const { reportError, setClient } = await freshModule();
    const first = new Error('during the first render');
    reportError(first);

    const { client, captured } = stub();
    setClient(client);

    expect(captured).toEqual([first]);
  });

  it('sends straight through once loaded, without queueing', async () => {
    const { reportError, setClient } = await freshModule();
    const { client, captured } = stub();
    setClient(client);

    const later = new Error('after hydration');
    reportError(later);

    expect(captured).toEqual([later]);
  });

  it('stops holding errors long before a loop could exhaust memory', async () => {
    const { reportError, setClient } = await freshModule();
    for (let i = 0; i < 50; i++) reportError(new Error(`loop ${i}`));

    const { client, captured } = stub();
    setClient(client);

    expect(captured).toHaveLength(10);
  });

  it('survives a client that throws, because reporting a failure is not one', async () => {
    const { reportError, setClient } = await freshModule();
    const client = {
      captureException: () => {
        throw new Error('capture is broken');
      },
    } as unknown as PostHog;
    setClient(client);

    expect(() => reportError(new Error('anything'))).not.toThrow();
  });
});
