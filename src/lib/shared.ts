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

// The status page's public address, and the monitors it speaks for.
//
// Shared rather than duplicated because two things filter by this list: the
// status page itself, and the indicator in this site's navbar. The JSON
// endpoint carries every monitor that is checked, staging included, so a
// consumer that derived a color from the whole payload would turn this navbar
// red for every reader because a pre-production environment blipped.
export const statusUrl = 'https://status.marfa.so';
export const PUBLIC_MONITORS = ['api', 'api-files', 'docs'] as const;
