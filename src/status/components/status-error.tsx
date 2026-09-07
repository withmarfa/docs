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

/** An unknown path on the status page. It had none of its own before. */
export function StatusNotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="mx-auto flex w-full max-w-3xl grow flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-fd-foreground sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-sm text-fd-muted-foreground">
          This site carries the current status of Marfa and nothing else.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="/"
            className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90"
          >
            Current status
          </a>
          <a
            href={DOCS_URL}
            className="rounded-lg border border-fd-border px-4 py-2 text-sm font-medium text-fd-foreground hover:bg-fd-accent"
          >
            Documentation
          </a>
        </div>
      </div>
    </HomeLayout>
  );
}
