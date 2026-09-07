import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { StatusError, StatusNotFound } from './components/status-error';

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    // Without both of these the router falls back to its own components, which
    // print the thrown message verbatim and answer an unknown path with a bare
    // paragraph. The first of those published the store's table name.
    defaultErrorComponent: StatusError,
    defaultNotFoundComponent: StatusNotFound,
  });
}
