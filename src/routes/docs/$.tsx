import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { createServerFn } from '@tanstack/react-start';
import { slugsToMarkdownPath, source } from '@/lib/source';
import browserCollections from 'collections/browser';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { baseOptions } from '@/lib/layout.shared';
import { gitConfig } from '@/lib/shared';
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
const REDIRECTS: Record<string, string> = {
  // The Tier page is canonically about the Tier axis; the old URL leaked an
  // internal namespace name. See Docs Content Evaluation for the rationale.
  'concepts/library': '/docs/guides/core-model/tier',
};

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const splat = params._splat ?? '';
    if (REDIRECTS[splat]) {
      throw redirect({ href: REDIRECTS[splat], statusCode: 301 });
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

    const pageTree = await source.serializePageTree(source.getPageTree());

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
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
          />
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
    <DocsLayout {...baseOptions()} tree={pageTree} tabMode="auto" tabs={{}}>
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

  return (
    <DocsLayout {...baseOptions()} tree={pageTree} tabMode="auto" tabs={{}}>
      <Suspense>{clientLoader.useContent(path, { markdownUrl, path })}</Suspense>
    </DocsLayout>
  );
}
