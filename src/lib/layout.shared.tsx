import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Home } from 'lucide-react';
import { appName, gitConfig } from './shared';
import { SectionNav } from '@/components/section-nav';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // The logo is the home affordance: a Home glyph plus the wordmark, linking
      // to the Introduction landing.
      title: (
        <span className="inline-flex items-center gap-2">
          <Home className="size-4" aria-hidden />
          {appName}
        </span>
      ),
      url: '/introduction',
    },
    // The five section tabs render as pills in the navbar (OpenAI-style), in
    // place of the central search. The native notebook tab row is hidden via
    // CSS but still scopes the sidebar by URL.
    links: [{ type: 'custom', children: <SectionNav /> }],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
