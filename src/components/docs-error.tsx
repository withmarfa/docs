import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { DocsHomeHeader } from './docs-header';
import { ErrorPage } from './error-page';
import { reportError } from '@/lib/analytics';
import type { ErrorComponentProps } from '@tanstack/react-router';

export function DocsError({ error }: ErrorComponentProps) {
  // The message is for whoever is debugging, and the console is where they
  // will look. It does not belong in the response body.
  if (typeof console !== 'undefined') console.error(error);
  // And to error tracking, which is the half nobody is watching.
  reportError(error);

  return (
    <HomeLayout {...baseOptions()} slots={{ ...baseOptions().slots, header: DocsHomeHeader }}>
      <ErrorPage
        message="This page could not be loaded. It is usually temporary, so trying again in a moment is worth doing before anything else."
        primaryHref="/"
        primaryLabel="Try again"
        secondaryHref="/overview"
        secondaryLabel="Overview"
      />
    </HomeLayout>
  );
}
