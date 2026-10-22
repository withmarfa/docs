import { createFileRoute, notFound } from '@tanstack/react-router';
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
import { pageHead } from '@/lib/page-head';
import { DocsHeader } from '@/components/docs-header';
import { PageActions } from '@/components/page-actions';
import { PageFooter } from '@/components/page-footer';
import { SidebarFooter } from '@/components/release-label';
import {
  useFumadocsLoader,
  deserializePageTree,
  type SerializedPageTree,
} from 'fumadocs-core/source/client';
import { Suspense } from 'react';
import { cn } from '@/lib/cn';
import { useMDXComponents } from '@/components/mdx';
import { APIPage } from '@/components/api-page';
import {
  PageTableOfContents,
  PageTableOfContentsPopover,
} from '@/components/page-table-of-contents';

// The page title and lead at the website's sizes, a step down on phones.
const titleClass = 'text-[1.375rem] leading-tight tracking-[-0.01em] sm:text-[1.625rem]';
const descriptionClass = 'mb-6 text-[0.9375rem] leading-relaxed sm:text-base';

// Folders collapse to their headers by default and the active trail opens. The
// footer holds the release label at the bottom of the sidebar, on desktop and
// in the phone menu.
const sidebarOptions = {
  defaultOpenLevel: 0,
  collapsible: false,
  footer: SidebarFooter,
};

export const Route = createFileRoute('/$')({
  component: Page,
  loader: async ({ params }) => {
    const splat = params._splat ?? '';
    const slugs = splat.split('/');
    const data = await serverLoader({ data: slugs });
    if (data.kind === 'docs') {
      await clientLoader.preload(data.path);
    }
    return data;
  },
  head: ({ loaderData }) => pageHead(loaderData),
});

const serverLoader = createServerFn({
  method: 'GET',
})
  .validator((slugs: string[]) => slugs)
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
      title: page.data.title ?? '',
      description: page.data.description ?? '',
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
          <DocsTitle className={cn(titleClass, 'min-w-0')}>{frontmatter.title}</DocsTitle>
          <div className="flex flex-row gap-2 items-center shrink-0">
            <PageActions
              markdownUrl={markdownUrl}
              githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
            />
          </div>
        </div>
        {frontmatter.description ? (
          <DocsDescription className={cn(descriptionClass, frontmatter.identifier && 'mb-0')}>
            {frontmatter.description}
          </DocsDescription>
        ) : null}
        {frontmatter.identifier ? (
          <p className="marfa-identifier">
            <span>Identifier</span>
            <code>{frontmatter.identifier}</code>
          </p>
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
      slots={{ ...baseOptions().slots, header: DocsHeader }}
      tree={pageTree}
      tabMode="navbar"
      sidebar={sidebarOptions}
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
            <DocsTitle className={titleClass}>{data.title}</DocsTitle>
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
  data: {
    kind: 'docs';
    path: string;
    markdownUrl: string;
    pageTree: SerializedPageTree;
  };
}) {
  const { path, pageTree, markdownUrl } = useFumadocsLoader(data);

  return (
    <DocsLayout
      {...baseOptions()}
      nav={{ ...baseOptions().nav, mode: 'top' }}
      slots={{ ...baseOptions().slots, header: DocsHeader }}
      tree={pageTree}
      tabMode="navbar"
      sidebar={sidebarOptions}
    >
      <Suspense>{clientLoader.useContent(path, { markdownUrl, path })}</Suspense>
    </DocsLayout>
  );
}
