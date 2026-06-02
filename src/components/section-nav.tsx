import Link from 'fumadocs-core/link';
import { useRouterState } from '@tanstack/react-router';

// The five top-level sections, rendered as OpenAI-style pills in the navbar.
// `prefix` drives the active highlight (any page under the section); `href` is
// the section's landing page. The native notebook tab row is hidden (CSS) — it
// still scopes the sidebar by URL — and these pills are the visible switcher.
const SECTIONS = [
  { label: 'Introduction', href: '/docs/get-started/overview', prefix: '/docs/get-started' },
  { label: 'Guides', href: '/docs/guides', prefix: '/docs/guides' },
  { label: 'API reference', href: '/docs/api-reference', prefix: '/docs/api-reference' },
  { label: 'SDKs', href: '/docs/sdks/overview', prefix: '/docs/sdks' },
  {
    label: 'Self-hosting',
    href: '/docs/self-hosting/self-host-quickstart',
    prefix: '/docs/self-hosting',
  },
];

export function SectionNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex items-center gap-1" aria-label="Sections">
      {SECTIONS.map((section) => {
        const active =
          pathname === section.prefix || pathname.startsWith(`${section.prefix}/`);
        return (
          <Link
            key={section.prefix}
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
