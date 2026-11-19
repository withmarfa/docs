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

// The tree names a page by its `sidebar_label`, which is a name for the
// sidebar. The card names the page it leads to, so it shows the full title
// (`titles`, from `fullTitles`). A description is Markdown, and the card prints
// it as text, so this also renders its inline code. The card's own lookup of
// the previous and next page stays.
function forCard(item: FooterItem | undefined, titles: Record<string, string>): FooterItem | undefined {
  if (!item) return item;
  const name = titles[item.url] ?? item.name;
  if (typeof item.description !== 'string') return { ...item, name };
  return { ...item, name, description: renderInlineCode(item.description) };
}

export function PageFooter({ titles = {}, ...props }: ComponentProps<typeof FumadocsPageFooter> & { titles?: Record<string, string> }) {
  const pages = useFooterItems();
  const pathname = trimSlash(usePathname());

  const items = useMemo(() => {
    const index = pages.findIndex((page) => trimSlash(page.url) === pathname);
    if (index === -1) return {};
    return { previous: forCard(pages[index - 1], titles), next: forCard(pages[index + 1], titles) };
  }, [pages, pathname, titles]);

  // The card keeps half the width whether or not its neighbour exists, so a
  // page with only a next page shows the card on the right, as when both show.
  const lone = items.next && !items.previous ? 'next' : undefined;

  return <FumadocsPageFooter
      {...props}
      className={cn('marfa-page-footer grid-cols-2', props.className)}
      data-lone={lone}
      items={items}
    />;
}
