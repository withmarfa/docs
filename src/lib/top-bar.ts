// The pages the top bar links to, which no sidebar lists. They sit in
// `content/docs/(reference)/` and in no `meta.json`; `docs-map.ts` and
// `docs-structure.test.ts` read this list, so a page outside the sidebars is
// either here or an error.
export const TOP_BAR_LINKS = [
  { label: 'Glossary', href: '/glossary' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Get help', href: '/get-help' },
] as const;
