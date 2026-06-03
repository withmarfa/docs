export const appName = 'Marfa docs';
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
