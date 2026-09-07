import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { NotFound } from '@/components/not-found';
import { DocsError } from '@/components/docs-error';

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
    // A thrown error otherwise reaches the router's own component, which
    // renders the message verbatim on a public page.
    defaultErrorComponent: DocsError,
  });
}
