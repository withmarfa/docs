import { usePathname } from 'fumadocs-core/framework';
import { PageFooter as FumadocsPageFooter } from 'fumadocs-ui/layouts/notebook/page';
import { useFooterItems } from 'fumadocs-ui/utils/use-footer-items';
import { useMemo, type ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { renderInlineCode } from '@/lib/inline-code';

type FooterItems = NonNullable<ComponentProps<typeof FumadocsPageFooter>['items']>;
type FooterItem = NonNullable<FooterItems['previous']>;

const trimSlash = (path: string) =>
  path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

// A description is Markdown, and the card prints it as text. This keeps the
// card's own lookup of the previous and next page and renders only its inline
// code.
function withCode(item: FooterItem | undefined): FooterItem | undefined {
  if (!item || typeof item.description !== 'string') return item;
  return { ...item, description: renderInlineCode(item.description) };
}

export function PageFooter(props: ComponentProps<typeof FumadocsPageFooter>) {
  const pages = useFooterItems();
  const pathname = trimSlash(usePathname());

  const items = useMemo(() => {
    const index = pages.findIndex((page) => trimSlash(page.url) === pathname);
    if (index === -1) return {};
    return { previous: withCode(pages[index - 1]), next: withCode(pages[index + 1]) };
  }, [pages, pathname]);

  return <FumadocsPageFooter
      {...props}
      className={cn('marfa-page-footer', props.className)}
      items={items}
    />;
}
