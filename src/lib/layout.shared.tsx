import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';
import { SectionNav } from '@/components/section-nav';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // The wordmark is the home affordance, linking to the Introduction landing.
      title: appName,
      url: '/introduction',
    },
    // The five section tabs render as pills in the navbar (OpenAI-style), in
    // place of the central search. The native notebook tab row is hidden via
    // CSS but still scopes the sidebar by URL.
    links: [{ type: 'custom', children: <SectionNav /> }],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
