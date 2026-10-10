import Link from 'fumadocs-core/link';
import { useRouterState } from '@tanstack/react-router';

// The top-level sections, rendered as OpenAI-style pills in the navbar.
// `prefix` drives the active highlight (any page under the section); `href` is
// the section's landing page. The Overview has no prefix: its folder is a
// group, so its pages sit at the site root (`/files`, `/cli`) and it is the
// section that every path outside the other two belongs to. The native
// notebook tab row is hidden (CSS), but it still scopes the sidebar by URL;
// these pills are the visible switcher.
const SECTIONS = [
  { label: 'Overview', href: '/overview', prefix: null },
  { label: 'Guides', href: '/guides/swift-app', prefix: '/guides' },
  { label: 'API reference', href: '/api-reference', prefix: '/api-reference' },
];

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function SectionNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex items-center gap-1" aria-label="Sections">
      {SECTIONS.map((section) => {
        const active =
          section.prefix === null
            ? SECTIONS.every((other) => other.prefix === null || !isUnder(pathname, other.prefix))
            : isUnder(pathname, section.prefix);
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
