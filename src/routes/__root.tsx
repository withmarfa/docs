import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import * as React from 'react';
import appCss from '@/styles/app.css?url';
import { Analytics } from '@/components/analytics';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

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
        title: 'Marfa Docs',
      },
      {
        name: 'description',
        content:
          'A home for your personal data that you run yourself, and the pieces that work with it.',
      },
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
        <RootProvider>
          <Outlet />
        </RootProvider>
        <Scripts />
        <Analytics site="docs" />
      </body>
    </html>
  );
}
