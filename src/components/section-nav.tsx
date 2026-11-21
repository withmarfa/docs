import Link from 'fumadocs-core/link';
import { useRouterState } from '@tanstack/react-router';

// Every page's address starts with its tab's segment (`/use/sync-a-folder`,
// `/reference/cli`). Home's segment is the root, so a page that starts with no
// other tab's segment belongs to Home: `/`, `/quickstart`, `/glossary`.
function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const OTHER_TABS = ['/use', '/run', '/build', '/catalog', '/reference'];

// The top-level sections, drawn as pills in the middle of the top bar
// (DocsHeader). `href` is the first page in the section's sidebar. The notebook layout's own
// tabs aren't drawn, since the header slot replaces them, but they still scope
// the sidebar by URL; these pills are the visible switcher.
export const SECTIONS: { label: string; href: string; matches: (pathname: string) => boolean }[] = [
  { label: 'Home', href: '/', matches: (pathname) => !OTHER_TABS.some((tab) => isUnder(pathname, tab)) },
  { label: 'Use', href: '/use/from-an-agent', matches: (pathname) => isUnder(pathname, '/use') },
  { label: 'Run', href: '/run/choose-where-to-run', matches: (pathname) => isUnder(pathname, '/run') },
  { label: 'Build', href: '/build/architecture', matches: (pathname) => isUnder(pathname, '/build') },
  { label: 'Catalog', href: '/catalog/items', matches: (pathname) => isUnder(pathname, '/catalog') },
  { label: 'Reference', href: '/reference/api', matches: (pathname) => isUnder(pathname, '/reference') },
];

export function sectionFor(pathname: string) {
  return (SECTIONS.find((section) => section.matches(pathname)) ?? SECTIONS[0]).label;
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
