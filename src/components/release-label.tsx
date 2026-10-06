import type { ComponentProps } from 'react';
import Link from 'fumadocs-core/link';
import release from '@/generated/marfa-release.json';

// The Marfa release these docs describe. The version comes from the
// monorepo's latest tag (scripts/sync-from-marfa.sh), because the API
// description's version is the contract version, not the product version.
export function ReleaseLabel() {
  return (
    <Link
      href="/changelog"
      className="w-fit text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground"
    >
      Marfa {release.version}
    </Link>
  );
}

// Fumadocs hides the default sidebar footer on desktop, so a plain footer node
// only ever shows in the phone menu. This function form renders the label in a
// row of its own, visible at every width, and keeps the default footer (icon
// links and theme switch in the phone menu) beneath it.
export function SidebarFooter(props: ComponentProps<'div'>) {
  return (
    <>
      <div className="flex border-t px-4 py-2.5">
        <ReleaseLabel />
      </div>
      <div {...props} />
    </>
  );
}
