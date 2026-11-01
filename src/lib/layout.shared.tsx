import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';
import { NpmIcon } from '@/components/site-header';
import { ThemeSwitch } from '@/components/theme-switch';

// The top bar is the layouts' `header` slot (DocsHeader), which places its own
// links. These options feed what the layouts still draw themselves: the phone
// menu's footer, which shows the icon links and the appearance control.
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: appName,
      url: '/',
    },
    links: [
      {
        type: 'icon',
        label: 'npm',
        text: 'npm',
        url: `https://www.npmjs.com/org/${gitConfig.user}`,
        icon: <NpmIcon />,
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    slots: { themeSwitch: ThemeSwitch },
  };
}
