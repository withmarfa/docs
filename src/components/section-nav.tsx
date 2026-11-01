import Link from 'fumadocs-core/link';
import { useRouterState } from '@tanstack/react-router';
import referenceMeta from '../../content/docs/(reference)/meta.json';

// The Start and Reference folders are groups, so their pages share the site
// root (`/files`, `/cli`). A Reference page is told apart by its first path
// segment, read from the folder's own list so a new page can't be missed; the
// API's pages sit under `/api-reference`. Start is every path that belongs to
// no other section, `/` included.
const REFERENCE_SEGMENTS = new Set([
  ...referenceMeta.pages.filter((entry) => /^[a-z0-9-]+$/.test(entry)),
  'api-reference',
]);

function firstSegment(pathname: string) {
  return pathname.split('/').filter(Boolean)[0] ?? '';
}

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// The top-level sections, drawn as pills in the middle of the top bar
// (DocsHeader). `href` is the section's landing page. The notebook layout's own
// tabs aren't drawn, since the header slot replaces them, but they still scope
// the sidebar by URL; these pills are the visible switcher.
export const SECTIONS: { label: string; href: string; matches: ((pathname: string) => boolean) | null }[] = [
  { label: 'Start', href: '/', matches: null },
  { label: 'Run', href: '/run', matches: (pathname) => isUnder(pathname, '/run') },
  { label: 'Catalog', href: '/catalog', matches: (pathname) => isUnder(pathname, '/catalog') },
  { label: 'Build', href: '/build', matches: (pathname) => isUnder(pathname, '/build') },
  {
    label: 'Reference',
    href: '/reference',
    matches: (pathname) => REFERENCE_SEGMENTS.has(firstSegment(pathname)),
  },
];

export function sectionFor(pathname: string) {
  return (
    SECTIONS.find((section) => section.matches?.(pathname)) ??
    SECTIONS.find((section) => section.matches === null)!
  ).label;
}

export function SectionNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = sectionFor(pathname);

  return (
    <nav className="flex items-center gap-1" aria-label="Sections">
      {SECTIONS.map((section) => {
        const active = section.label === current;
        return (
          <Link
            key={section.label}
            href={section.href}
            data-active={active}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent/60 hover:text-fd-accent-foreground data-[active=true]:bg-fd-accent data-[active=true]:text-fd-accent-foreground"
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
