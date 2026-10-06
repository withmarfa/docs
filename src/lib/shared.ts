export const appName = 'Marfa Docs';
// Docs live at the site root — no `/docs` URL prefix. Kept as a named constant
// (empty string) so URL-builders (source baseUrl, markdown-twin paths, the docs
// map) and the `.md` negotiation middleware share one source of truth.
export const docsRoute = '';
export const docsImageRoute = '/og/docs';

// GitHub config for "edit this page" links and similar.
export const gitConfig = {
  user: 'withmarfa',
  repo: 'docs',
  branch: 'main',
};

// The status page's public address, and the monitors it speaks for.
//
// Shared rather than duplicated because three things read this list: the status
// page, its JSON endpoint, and the indicator in this site's navbar. The store
// behind the page can hold state for monitors that are no longer configured, so
// each of them reports only the monitors named here.
export const statusUrl = 'https://status.marfa.so';
export const PUBLIC_MONITORS = ['docs'] as const;
