import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import * as React from 'react';
import appCss from '@/styles/app.css?url';
import { Analytics } from '@/components/analytics';
import { PointerFocus } from '@/components/pointer-focus';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import { translations } from '@/lib/translations';
import { appName, siteUrl } from '@/lib/shared';

const siteDescription =
  'Marfa is a shared data layer for your apps, and you run it yourself. These docs cover it and the pieces that work with it.';
const shareImageAlt = 'Marfa Docs: a shared data layer for your apps, and you run it yourself.';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: appName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      // The share card every page has. A page route replaces the title,
      // description and address with its own, and adds its canonical link.
      { property: 'og:site_name', content: appName },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: appName },
      { property: 'og:description', content: siteDescription },
      { property: 'og:image', content: `${siteUrl}/og.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: shareImageAlt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image:alt', content: shareImageAlt },
    ],
    links: [
      // The mark, in three forms. SVG for anything modern; the PNG is the
      // fallback for a reader or unfurler that will not take one; and
      // apple-touch-icon is flattened, because iOS composites transparency
      // against black before applying its own rounded mask.
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.png', type: 'image/png', sizes: '96x96' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={{ translations }}>
          <Outlet />
        </RootProvider>
        <Scripts />
        <Analytics site="docs" />
        <PointerFocus />
      </body>
    </html>
  );
}
