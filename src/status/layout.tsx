import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { ThemeSwitch } from '../components/theme-switch';
import { BookOpen, Rss } from 'lucide-react';
import { gitConfig } from '../lib/shared';

// Wordmarks from simple-icons, monochrome via currentColor so they sit
// together with the two lucide glyphs below. Duplicated from the docs layout
// rather than imported: that module pulls the docs section pills, which
// navigate into a site this one is reporting on and would be dead links at the
// exact moment someone is here.
const NpmIcon = (
  <svg role="img" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
  </svg>
);

const GitHubIcon = (
  <svg role="img" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

export const DOCS_URL = 'https://docs.marfa.so';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Marfa Status',
      url: '/',
    },
    // Every item is secondary so the whole set sits on the right, leaving the
    // wordmark alone on the left. Order here is order on screen.
    links: [
      // An icon rather than the word, so the row reads as one set of controls
      // instead of a label followed by four glyphs. `icon` items are secondary
      // by default, which is also what keeps this off the left-hand side.
      {
        type: 'icon',
        label: 'Marfa documentation',
        text: 'Docs',
        url: DOCS_URL,
        icon: <BookOpen />,
        external: true,
        secondary: true,
      },
      {
        type: 'icon',
        label: 'Subscribe to the status feed',
        text: 'Feed',
        url: '/feed.xml',
        icon: <Rss />,
        secondary: true,
      },
      {
        type: 'icon',
        label: 'npm',
        text: 'npm',
        url: `https://www.npmjs.com/org/${gitConfig.user}`,
        icon: NpmIcon,
        external: true,
        secondary: true,
      },
      // Written out rather than passed as `githubUrl`, which the layout appends
      // after everything else — including the theme toggle below, which has to
      // be last.
      {
        type: 'icon',
        label: 'GitHub',
        text: 'GitHub',
        url: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
        icon: GitHubIcon,
        external: true,
        secondary: true,
      },
      { type: 'custom', secondary: true, children: <ThemeSwitch /> },
    ],
    // Disabled so it can be placed above instead. The layout otherwise renders
    // it ahead of every icon, and it belongs at the far edge.
    themeSwitch: { enabled: false },
  };
}
