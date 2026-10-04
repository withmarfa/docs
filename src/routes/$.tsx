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
import {
  PageTableOfContents,
  PageTableOfContentsPopover,
} from '@/components/page-table-of-contents';

// Legacy URL redirects — old URLs that drifted during the Fumadocs port and the
// later restructures. Keep the entries here so a stale link out in the wild
// still lands on the right canonical page instead of 404ing.
//   - The docs once lived under a `/docs` URL prefix (now the site root). Any
//     bookmarked `/docs/...` URL is de-prefixed before further mapping.
//   - The pre-restructure docs lived under concepts/*, api/*, and
//     sdks-and-clients/*; `get-started/*` was later renamed to `introduction/*`
//     (with the old Overview folded into the Introduction landing).
const LEGACY_EXACT: Record<string, string> = {
  // `library` leaked an internal namespace name; the page is canonically Tier.
  'concepts/library': 'guides/core-model/tier',
  'concepts/lifecycle/lifecycle': 'guides/core-model/lifecycle',
  'concepts/lifecycle/marketplace': 'guides/connections/marketplace',
  'concepts/lifecycle/provenance': 'guides/core-model/provenance',
  'concepts/lifecycle/tier': 'guides/core-model/tier',
  'api/authentication': 'api-reference/authentication',
  'api/bulk-operations': 'guides/querying/bulk-operations',
  'api/errors': 'api-reference/errors',
  'api/inbound-webhooks': 'guides/realtime/inbound-webhooks',
  'api/permissions': 'api-reference/permissions',
  'api/rate-limiting': 'api-reference/rate-limits',
  'api/realtime': 'guides/realtime/realtime',
  'api/search-and-query': 'guides/querying/search-and-query',
  'api/webhooks': 'guides/realtime/webhooks',
  // The auth contract and the cross-cutting error / rate-limit reference moved
  // out of Guides into the API reference's General section, so the endpoints
  // that need them sit alongside them. Old Guides URLs 301 to the new homes.
  'guides/auth/authentication': 'api-reference/authentication',
  'guides/auth/permissions': 'api-reference/permissions',
  'guides/operations/errors': 'api-reference/errors',
  'guides/operations/rate-limiting': 'api-reference/rate-limits',
  'self-hosting/run/deployment-modes': 'guides/identity/deployment-modes',
  // The self-host quickstart moved into Introduction as Quickstart (self-hosted);
  // the Self-hosting tab now lands on the section overview at `/self-hosting`.
  'self-hosting/self-host-quickstart': 'self-hosting',
  // The Introduction landing absorbed the old Overview page.
  'get-started/overview': 'introduction',
  'introduction/overview': 'introduction',
};

const LEGACY_PREFIXES: [string, string][] = [
  ['concepts/data-primitives/', 'guides/core-model/'],
  ['concepts/connections/', 'guides/connections/'],
  ['concepts/identity/', 'guides/identity/'],
  ['concepts/schema/', 'guides/schema/'],
  ['sdks-and-clients/', 'sdks/'],
  ['get-started/', 'introduction/'],
];

function legacyTarget(splat: string): string | null {
  // Strip the retired `/docs` URL prefix first, so old bookmarks like
  // `/docs/guides/...` (and `/docs/get-started/...`) flow through the same
  // mapping as their de-prefixed forms and 301 once to the canonical URL.
  let path = splat;
  let prefixStripped = false;
  if (path === 'docs') {
    return '/introduction';
  }
  if (path.startsWith('docs/')) {
    path = path.slice('docs/'.length);
    prefixStripped = true;
  }

  const exact = LEGACY_EXACT[path];
  if (exact) return `/${exact}`;
  for (const [from, to] of LEGACY_PREFIXES) {
    if (path.startsWith(from)) return `/${to}${path.slice(from.length)}`;
  }

  // Only the `/docs` prefix was legacy — redirect to the de-prefixed path.
  if (prefixStripped) return `/${path}`;
  return null;
}

export const Route = createFileRoute('/$')({
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
        apiProps: await page.data.getOpenAPIPageProps(),
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
        tableOfContent={{
          enabled: true,
          component: <PageTableOfContents />,
        }}
        tableOfContentPopover={{
          enabled: toc.length > 1,
          component: <PageTableOfContentsPopover />,
        }}
        footer={{ component: <PageFooter className="mt-12" /> }}
      >
        {/* Title and the Copy button share the top row; the description spans the
            full content width on its own line below, like a lead paragraph. */}
        <div className="flex flex-row items-start justify-between gap-4">
          <DocsTitle className="min-w-0">{frontmatter.title}</DocsTitle>
          <div className="flex flex-row gap-2 items-center shrink-0">
            <PageActions
              markdownUrl={markdownUrl}
              githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
            />
          </div>
        </div>
        {frontmatter.description ? (
          <DocsDescription>{frontmatter.description}</DocsDescription>
        ) : null}
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
        // Reserve the TOC column (empty) so the page grid is symmetric — sidebar
        // on the left, an equal-width column on the right — which centres the
        // main column, and therefore the 680px body, on the screen exactly like
        // a narrative page. The code rail (api-page.tsx) sits to the right of the
        // centred body and extends into this reserved space.
        tableOfContent={{ enabled: true }}
        toc={[]}
        footer={{ component: <PageFooter className="mt-12" /> }}
      >
        {/* The breadcrumb, title, body, and footer are each centred at 680px (in
            app.css) so they sit screen-centred like a narrative page; the code
            rail extends to the right of the centred body. Title on the left, the
            Copy Markdown button at the body's top-right. */}
        <div className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <DocsTitle>{data.title}</DocsTitle>
          </div>
          <div className="shrink-0">
            <PageActions markdownUrl={data.markdownUrl} />
          </div>
        </div>
        <DocsBody>
          <Suspense>
            {/* Title comes from DocsTitle above (paired with the Copy button).
                Let APIPage render the operation description through its own
                markdown pipeline so inline `code` renders as code, not raw
                backticks. */}
            <APIPage {...data.apiProps} showTitle={false} />
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
