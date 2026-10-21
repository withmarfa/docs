import type { ComponentProps } from 'react';
import type { HomeLayoutProps } from 'fumadocs-ui/layouts/home';
import { BookOpen, Rss } from 'lucide-react';
import { GitHubIcon, HeaderBar, IconLink, NpmIcon } from '../components/site-header';
import { ThemeSwitch } from '../components/theme-switch';
import { gitConfig } from '../lib/shared';

export const DOCS_URL = 'https://docs.marfa.so';

// The docs site's top bar with this site's own links. No section switcher:
// those navigate into the site this page reports on, and would be dead links
// at the moment someone is here.
function StatusHeader(props: ComponentProps<'header'>) {
  return (
    <header {...props} className="sticky top-0 z-40 bg-fd-background/80 backdrop-blur-sm">
      <HeaderBar
        title="Marfa Status"
        href="/"
        actions={
          <>
            <IconLink label="Marfa documentation" href={DOCS_URL}>
              <BookOpen strokeWidth={1.75} />
            </IconLink>
            <IconLink label="Subscribe to the status feed" href="/feed.xml">
              <Rss strokeWidth={1.75} />
            </IconLink>
            <IconLink label="npm" href={`https://www.npmjs.com/org/${gitConfig.user}`}>
              <NpmIcon />
            </IconLink>
            <IconLink label="GitHub" href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}>
              <GitHubIcon />
            </IconLink>
            <ThemeSwitch />
          </>
        }
      />
    </header>
  );
}

export function baseOptions(): HomeLayoutProps {
  return {
    nav: { title: 'Marfa Status', url: '/' },
    slots: { header: StatusHeader },
  };
}
