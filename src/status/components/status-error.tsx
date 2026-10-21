import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions, DOCS_URL } from '../layout';
import { ErrorPage } from '../../components/error-page';
import { reportError } from '../../lib/analytics';
import type { ErrorComponentProps } from '@tanstack/react-router';

/**
 * The status page's version, which has to say more than the documentation
 * site's.
 *
 * A generic apology here is actively misleading: someone who cannot load this
 * page must not conclude that the services it watches are fine. So the message
 * says what the page cannot tell them, and points at the JSON endpoint, which
 * is a different route and will often still be serving.
 */
export function StatusError({ error }: ErrorComponentProps) {
  if (typeof console !== 'undefined') console.error(error);
  // And to error tracking, which is the half nobody is watching.
  reportError(error);

  return (
    <HomeLayout {...baseOptions()}>
      <ErrorPage
        message="This page could not read what the checker last recorded, so it cannot tell you whether Marfa is available. That is a fault here, and not necessarily in the services this page watches."
        primaryHref="/"
        primaryLabel="Try again"
        secondaryHref="/api/data"
        secondaryLabel="Read the raw JSON"
      />
    </HomeLayout>
  );
}

/** An unknown path on the status page. */
export function StatusNotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <ErrorPage
        title="Page not found"
        message="This site carries the current status of Marfa and nothing else."
        primaryHref="/"
        primaryLabel="Current status"
        secondaryHref={DOCS_URL}
        secondaryLabel="Documentation"
      />
    </HomeLayout>
  );
}
