import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
// The docs site's stylesheet, verbatim. Sharing it is the whole reason this
// page is built from this repository: the two sites read as one product
// without either one owning a copy of the other's theme.
import appCss from '../../styles/app.css?url';
import { Analytics } from '../../components/analytics';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Marfa Status' },
      {
        name: 'description',
        content: 'Current availability of the Marfa API, file storage and documentation.',
      },
    ],
    links: [
      // The same three files the documentation site serves: one `public/`
      // directory feeds both build targets, so the two sites cannot end up
      // wearing different marks.
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
      <body className="flex min-h-screen flex-col">
        {/* No search index here, and the provider ships a search dialog with a
            full Markdown pipeline behind it by default. Turning it off is worth
            about 600 kB on the one page whose job is to load when other things
            are not. */}
        <RootProvider search={{ enabled: false }}>
          <Outlet />
        </RootProvider>
        <Scripts />
        <Analytics site="status" />
      </body>
    </html>
  );
}
