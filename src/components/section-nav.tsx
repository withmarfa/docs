import Link from 'fumadocs-core/link';
import { useRouterState } from '@tanstack/react-router';
import referenceMeta from '../../content/docs/(reference)/meta.json';
import { cn } from '../lib/cn';
import { TOP_BAR_LINKS } from '../lib/top-bar';

// The Start and Reference folders are groups, so their pages share the site
// root (`/quickstart`, `/cli`). A Reference page is told apart by its first
// path segment, read from the folder's own list so a new page can't be missed;
// the API's pages sit under `/api-reference`, the folder the list lifts in with
// `...`. Start is every path that belongs to no other section, `/` included,
// except the pages the top bar links to, which belong to none.
const REFERENCE_SEGMENTS = new Set(
  referenceMeta.pages.map((entry) => entry.replace(/^\.\.\./, '')).filter((entry) => /^[a-z0-9-]+$/.test(entry)),
);

function firstSegment(pathname: string) {
  return pathname.split('/').filter(Boolean)[0] ?? '';
}

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// The top-level sections, drawn as pills in the middle of the top bar
// (DocsHeader). `href` is the first page in the section's sidebar. The notebook layout's own
// tabs aren't drawn, since the header slot replaces them, but they still scope
// the sidebar by URL; these pills are the visible switcher.
export const SECTIONS: { label: string; href: string; matches: ((pathname: string) => boolean) | null }[] = [
  { label: 'Start', href: '/', matches: null },
  { label: 'Use', href: '/use/from-an-agent', matches: (pathname) => isUnder(pathname, '/use') },
  { label: 'Run', href: '/run/memory-cpu-and-disk', matches: (pathname) => isUnder(pathname, '/run') },
  { label: 'Build', href: '/build/how-marfa-works', matches: (pathname) => isUnder(pathname, '/build') },
  { label: 'Catalog', href: '/catalog/items', matches: (pathname) => isUnder(pathname, '/catalog') },
  {
    label: 'Reference',
    href: '/api-reference',
    matches: (pathname) => REFERENCE_SEGMENTS.has(firstSegment(pathname)),
  },
];

export function sectionFor(pathname: string) {
  if (TOP_BAR_LINKS.some((link) => link.href === pathname)) return null;
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

// Glossary, Changelog and Get help: text links beside the icon row on a wide
// screen, and a row in the sidebar's footer below it, which the phone menu
// shows too. The page being read is marked.
export function TopBarLinks({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="More">
      {TOP_BAR_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? 'page' : undefined}
          className="rounded-md px-2.5 py-1.5 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent/60 hover:text-fd-accent-foreground aria-[current=page]:text-fd-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
