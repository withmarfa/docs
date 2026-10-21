'use client';
import { useNotebookLayout } from 'fumadocs-ui/layouts/notebook';
import { Menu, X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { appName, gitConfig } from '@/lib/shared';
import { cn } from '@/lib/cn';
import { SectionNav } from './section-nav';
import { GitHubIcon, HeaderBar, IconLink, NpmIcon, SearchButton, iconButton } from './site-header';
import { StatusIndicator } from './status-indicator';
import { ThemeSwitch } from './theme-switch';

// The docs top bar, given to the notebook layout as its `header` slot. Owning
// it fixes the order and size of every control in one place, where the stock
// header placed the search box, the tab row and the theme switch itself and
// left them to be moved and hidden from CSS.
//
// The icon row drops what the screen can't hold: the links below 1024px, the
// appearance control below 768px, where the phone menu carries both.
export function DocsHeader(props: ComponentProps<'header'>) {
  const { slots } = useNotebookLayout();
  const sidebar = slots.sidebar;
  const open = sidebar?.useSidebar?.().open ?? false;

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'sticky top-(--fd-docs-row-1) z-10 bg-fd-background/80 backdrop-blur-sm [grid-area:header] layout:[--fd-header-height:--spacing(14)]',
        props.className,
      )}
    >
      <HeaderBar
        title={appName}
        href="/overview"
        center={<SectionNav />}
        actions={
          <DocsActions>
            {sidebar ? (
              <sidebar.trigger className={cn(iconButton, 'md:hidden')}>
                {open ? <X strokeWidth={1.75} /> : <Menu strokeWidth={1.75} />}
              </sidebar.trigger>
            ) : null}
          </DocsActions>
        }
      />
    </header>
  );
}

// The docs bar's icon row, shared with the 404 page, which has no sidebar and
// so no menu button. `children` comes last in the row.
export function DocsActions({ children }: { children?: ReactNode }) {
  return (
    <>
      <StatusIndicator className="max-lg:hidden" />
      <IconLink
        label="npm"
        href={`https://www.npmjs.com/org/${gitConfig.user}`}
        className="max-lg:hidden"
      >
        <NpmIcon />
      </IconLink>
      <IconLink
        label="GitHub"
        href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
        className="max-lg:hidden"
      >
        <GitHubIcon />
      </IconLink>
      <ThemeSwitch className={children ? 'max-md:hidden' : undefined} />
      <SearchButton />
      {children}
    </>
  );
}

// The same bar for a page outside the notebook layout, such as the 404.
export function DocsHomeHeader(props: ComponentProps<'header'>) {
  return (
    <header
      {...props}
      className={cn('sticky top-0 z-40 bg-fd-background/80 backdrop-blur-sm', props.className)}
    >
      <HeaderBar title={appName} href="/overview" center={<SectionNav />} actions={<DocsActions />} />
    </header>
  );
}
