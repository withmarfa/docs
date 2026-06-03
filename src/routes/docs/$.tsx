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
      // A single-heading page (e.g. the landing) renders a pointless one-item
      // table of contents — on mobile it's a collapsible toggle that reveals
      // nothing. Drop the TOC unless there are at least two headings.
      <DocsPage
        toc={toc}
        tableOfContent={{ enabled: toc.length > 1 }}
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
      <DocsPage full>
        <DocsTitle>{data.title}</DocsTitle>
        {data.description ? <DocsDescription>{data.description}</DocsDescription> : null}
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
