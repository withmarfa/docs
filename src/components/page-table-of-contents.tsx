'use client';

import { TOCItem } from 'fumadocs-core/toc';
import {
  TOCScrollArea,
  useTOCItems,
} from 'fumadocs-ui/components/toc';
import { Text } from 'lucide-react';

function headingIndent(depth: number): string | undefined {
  if (depth <= 2) return undefined;
  return `${(depth - 2) * 0.75}rem`;
}

export function PageTableOfContents() {
  const items = useTOCItems();

  if (items.length === 0) {
    return (
      <div
        id="nd-toc-placeholder"
        className="hidden xl:layout:[--fd-toc-width:268px]"
      />
    );
  }

  return (
    <div
      id="nd-toc"
      className="sticky top-(--fd-docs-row-3) [grid-area:toc] flex h-[calc(var(--fd-docs-height)-var(--fd-docs-row-3))] w-(--fd-toc-width) flex-col pt-12 pe-4 pb-2 max-xl:hidden xl:layout:[--fd-toc-width:268px]"
    >
      <h3
        id="toc-title"
        className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
      >
        <Text className="size-4" />
        On this page
      </h3>
      <TOCScrollArea>
        <nav aria-labelledby="toc-title" className="flex flex-col">
          {items.map((item) => (
            <TOCItem
              key={item.url}
              href={item.url}
              className="py-1.5 text-sm text-fd-muted-foreground transition-colors wrap-anywhere hover:text-fd-accent-foreground data-[active=true]:font-medium data-[active=true]:text-fd-primary"
              style={{ paddingInlineStart: headingIndent(item.depth) }}
            >
              {item.title}
            </TOCItem>
          ))}
        </nav>
      </TOCScrollArea>
    </div>
  );
}
