import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { gitConfig } from '../lib/shared';

// npm wordmark (simple-icons), monochrome via currentColor so it sits beside
// the GitHub icon. Duplicated from the docs layout rather than imported: that
// module pulls the docs section pills, which navigate into a site this one is
// reporting on and would be dead links at the exact moment someone is here.
const NpmIcon = (
  <svg role="img" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
  </svg>
);

export const DOCS_URL = 'https://docs.marfa.so';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Marfa status',
      url: '/',
    },
    links: [
      {
        type: 'main',
        text: 'Documentation',
        url: DOCS_URL,
        external: true,
      },
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
