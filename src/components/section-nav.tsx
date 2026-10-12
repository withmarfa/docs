import Link from 'fumadocs-core/link';
import { useRouterState } from '@tanstack/react-router';
import toolsMeta from '../../content/docs/(tools)/meta.json';

// The Overview and Tools folders are groups, so their pages share the site root
// (`/files`, `/cli`). A Tools page is told apart by its first path segment,
// read from the folder's own list so a new page can't be missed. The Overview
// is every path that belongs to no other section.
const TOOLS_SEGMENTS = new Set(toolsMeta.pages.filter((entry) => /^[a-z0-9-]+$/.test(entry)));

function firstSegment(pathname: string) {
  return pathname.split('/').filter(Boolean)[0] ?? '';
}

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// The top-level sections, rendered as OpenAI-style pills in the navbar. `href`
// is the section's landing page. The native notebook tab row is hidden (CSS),
// but it still scopes the sidebar by URL; these pills are the visible switcher.
const SECTIONS: { label: string; href: string; matches: ((pathname: string) => boolean) | null }[] = [
  { label: 'Overview', href: '/overview', matches: null },
  { label: 'Tools', href: '/cli', matches: (pathname) => TOOLS_SEGMENTS.has(firstSegment(pathname)) },
  { label: 'Guides', href: '/guides/swift-app', matches: (pathname) => isUnder(pathname, '/guides') },
  {
    label: 'API reference',
    href: '/api-reference',
    matches: (pathname) => isUnder(pathname, '/api-reference'),
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
