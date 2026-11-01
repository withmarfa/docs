import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { DocsHomeHeader } from './docs-header';
import { ErrorPage } from './error-page';

// The docs bar over a short message, in place of Fumadocs' default page, whose
// header placed its controls differently from every other page.
export function NotFound() {
  return (
    <HomeLayout {...baseOptions()} slots={{ ...baseOptions().slots, header: DocsHomeHeader }}>
      <ErrorPage
        title="Page not found"
        message="There's no page at this address. It may have moved, so start from the Overview or the Quickstart."
        primaryHref="/"
        primaryLabel="Go to the Overview"
        secondaryHref="/quickstart"
        secondaryLabel="Quickstart"
      />
    </HomeLayout>
  );
}
