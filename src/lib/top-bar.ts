// The pages the top bar links to, which no sidebar lists. They sit in
// `content/docs/(reference)/` and in no `meta.json`; `docs-map.ts` and
// `docs-structure.test.ts` read this list, so a page outside the sidebars is
// either here or an error. `kind` is what search ranks the page as: Get help
// answers a task, so it ranks with the guides that it was in before the move,
// and the Glossary and Changelog are lookups.
export const TOP_BAR_LINKS = [
  { label: 'Glossary', href: '/glossary', kind: 'reference' },
  { label: 'Changelog', href: '/changelog', kind: 'reference' },
  { label: 'Get help', href: '/get-help', kind: 'guide' },
] as const;
