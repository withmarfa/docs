import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';
import { SectionNav } from '@/components/section-nav';

// npm wordmark (simple-icons), monochrome via currentColor so it sits beside the
// GitHub icon. The navbar's icon button handles sizing.
const NpmIcon = (
  <svg role="img" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
  </svg>
);

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
    links: [
      { type: 'custom', children: <SectionNav /> },
      // npm org link, paired with the GitHub icon on the navbar's right edge.
      // The GitHub org and npm scope share the same slug.
      {
        type: 'icon',
        label: 'npm',
        text: 'npm',
        url: `https://www.npmjs.com/org/${gitConfig.user}`,
        icon: NpmIcon,
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
