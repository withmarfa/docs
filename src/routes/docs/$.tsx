import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { createServerFn } from '@tanstack/react-start';
import { slugsToMarkdownPath, source } from '@/lib/source';
import { regroupApiReference } from '@/lib/api-reference-tree';
import browserCollections from 'collections/browser';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  PageFooter,
} from 'fumadocs-ui/layouts/notebook/page';
import { baseOptions } from '@/lib/layout.shared';
import { gitConfig } from '@/lib/shared';
import { PageActions } from '@/components/page-actions';
import {
  useFumadocsLoader,
  deserializePageTree,
  type SerializedPageTree,
} from 'fumadocs-core/source/client';
import { Suspense } from 'react';
import { useMDXComponents } from '@/components/mdx';
import { APIPage } from '@/components/api-page';

// Legacy URL redirects — old Mintlify URLs that drifted during the Fumadocs
// port. Keep the entries here so a stale link out in the wild still lands on
// the right canonical page.
// The pre-restructure docs lived under /docs/concepts/*, /docs/api/*, and
// /docs/sdks-and-clients/*. Map those to the current structure so old links and
// bookmarks 301 to the right page instead of 404ing.
const LEGACY_EXACT: Record<string, string> = {
  // `library` leaked an internal namespace name; the page is canonically Tier.
  'concepts/library': 'guides/core-model/tier',
  'concepts/lifecycle/lifecycle': 'guides/core-model/lifecycle',
  'concepts/lifecycle/marketplace': 'guides/connections/marketplace',
  'concepts/lifecycle/provenance': 'guides/core-model/provenance',
  'concepts/lifecycle/tier': 'guides/core-model/tier',
  'api/authentication': 'guides/auth/authentication',
  'api/bulk-operations': 'guides/querying/bulk-operations',
  'api/errors': 'guides/operations/errors',
  'api/inbound-webhooks': 'guides/realtime/inbound-webhooks',
  'api/permissions': 'guides/auth/permissions',
  'api/rate-limiting': 'guides/operations/rate-limiting',
  'api/realtime': 'guides/realtime/realtime',
  'api/search-and-query': 'guides/querying/search-and-query',
  'api/webhooks': 'guides/realtime/webhooks',
  'self-hosting/run/deployment-modes': 'guides/identity/deployment-modes',
};

const LEGACY_PREFIXES: [string, string][] = [
  ['concepts/data-primitives/', 'guides/core-model/'],
  ['concepts/connections/', 'guides/connections/'],
  ['concepts/identity/', 'guides/identity/'],
  ['concepts/schema/', 'guides/schema/'],
  ['sdks-and-clients/', 'sdks/'],
];

function legacyTarget(splat: string): string | null {
  const exact = LEGACY_EXACT[splat];
  if (exact) return `/docs/${exact}`;
  for (const [from, to] of LEGACY_PREFIXES) {
    if (splat.startsWith(from)) return `/docs/${to}${splat.slice(from.length)}`;
  }
  return null;
}

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const splat = params._splat ?? '';
    const legacy = legacyTarget(splat);
    if (legacy) {
      throw redirect({ href: legacy, statusCode: 301 });
    }
    const slugs = splat.split('/');
    const data = await serverLoader({ data: slugs });
    if (data.kind === 'docs') {
      await clientLoader.preload(data.path);
    }
    return data;
  },
});

const serverLoader = createServerFn({
  method: 'GET',
})
  .inputValidator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    const pageTree = await source.serializePageTree(
      regroupApiReference(source.getPageTree()),
    );

    if (page.type === 'openapi') {
      return {
        kind: 'openapi' as const,
        title: page.data.title ?? '',
        description: page.data.description ?? '',
        markdownUrl: slugsToMarkdownPath(page.slugs).url,
        apiProps: await page.data.getClientAPIPageProps(),
        pageTree,
      };
    }

    return {
      kind: 'docs' as const,
      path: page.path,
      markdownUrl: slugsToMarkdownPath(page.slugs).url,
      pageTree,
    };
  });

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: MDX },
    {
      markdownUrl,
      path,
    }: {
      markdownUrl: string;
      path: string;
    },
  ) {
    return (
      // Keep the TOC column reserved on every narrative page (so the centred
      // body sits in the same place whether or not a page has a TOC), but only
      // show real entries when there are at least two headings — a single
      // heading would otherwise render a pointless one-item TOC and a mobile
      // popover that reveals nothing. Passing an empty toc renders fumadocs'
      // hidden placeholder, which reserves the column without showing anything.
      <DocsPage
        toc={toc.length > 1 ? toc : []}
        tableOfContent={{ enabled: true }}
        tableOfContentPopover={{ enabled: toc.length > 1 }}
      >
        <div className="flex flex-row items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <DocsTitle>{frontmatter.title}</DocsTitle>
            <DocsDescription>{frontmatter.description}</DocsDescription>
          </div>
          <div className="flex flex-row gap-2 items-center shrink-0">
            <PageActions
              markdownUrl={markdownUrl}
              githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
            />
          </div>
        </div>
        <DocsBody>
          <MDX components={useMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  },
});

function Page() {
  const data = Route.useLoaderData();

  if (data.kind === 'openapi') {
    return <OpenAPIView data={data} />;
  }
  return <DocsView data={data} />;
}

function OpenAPIView({
  data,
}: {
  data: {
    title: string;
    description: string;
    markdownUrl: string;
    apiProps: Parameters<typeof APIPage>[0];
    pageTree: SerializedPageTree;
  };
}) {
  const pageTree = deserializePageTree(data.pageTree);
  return (
    <DocsLayout
      {...baseOptions()}
      nav={{ ...baseOptions().nav, mode: 'top' }}
      tree={pageTree}
      tabMode="navbar"
      sidebar={{ defaultOpenLevel: 0, collapsible: false }}
    >
      <DocsPage
        full
        footer={{
          // Fill the centred --marfa-api-frame: the prev/next cards sit in the
          // 680px body column with a reserved 400px column aligning to the code
          // rail, so the footer shares the body's width and left edge and never
          // runs under the rail. The @container drives @4xl.
          component: (
            <div className="@container">
              <div className="flex flex-col gap-x-12 @4xl:flex-row @4xl:items-start">
                <div className="min-w-0 flex-1 @4xl:max-w-[680px]">
                  <PageFooter />
                </div>
                <div className="hidden shrink-0 @4xl:block @4xl:w-[400px]" aria-hidden />
              </div>
            </div>
          ),
        }}
      >
        {/* Fills the centred --marfa-api-frame: the title/description sit in the
            680px body column with the Copy Markdown button at its top-right, and
            a reserved 400px column aligns with the code rail below — so the
            header lines up with the request panel and the button no longer
            floats out at the rail's far edge. */}
        <div className="@container">
          <div className="flex flex-col gap-x-12 gap-y-2 @4xl:flex-row @4xl:items-start">
            <div className="flex min-w-0 flex-1 flex-row items-start justify-between gap-4 @4xl:max-w-[680px]">
              <div className="min-w-0">
                <DocsTitle>{data.title}</DocsTitle>
                {data.description ? (
                  <DocsDescription>{data.description}</DocsDescription>
                ) : null}
              </div>
              <div className="shrink-0">
                <PageActions markdownUrl={data.markdownUrl} />
              </div>
            </div>
            <div className="hidden shrink-0 @4xl:block @4xl:w-[400px]" aria-hidden />
          </div>
        </div>
        <DocsBody>
          <Suspense>
            {/* Title + description come from DocsTitle/DocsDescription above —
                suppress the component's own copies so they don't repeat. */}
            <APIPage {...data.apiProps} showTitle={false} showDescription={false} />
          </Suspense>
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}

function DocsView({
  data,
}: {
  data: { kind: 'docs'; path: string; markdownUrl: string; pageTree: SerializedPageTree };
}) {
  const { path, pageTree, markdownUrl } = useFumadocsLoader(data);

  // Folders collapse to their headers by default; the active trail auto-opens.
  // In the API reference this means the five section headers show with their
  // resource folders collapsed until you open one (or land on an endpoint).
  return (
    <DocsLayout
      {...baseOptions()}
      nav={{ ...baseOptions().nav, mode: 'top' }}
      tree={pageTree}
      tabMode="navbar"
      sidebar={{ defaultOpenLevel: 0, collapsible: false }}
    >
      <Suspense>{clientLoader.useContent(path, { markdownUrl, path })}</Suspense>
    </DocsLayout>
  );
}
